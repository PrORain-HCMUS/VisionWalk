import asyncio
from typing import Dict, List
from datetime import datetime
from geopy.distance import geodesic
from fastapi import WebSocket
from firebase_admin import db, firestore
from cachetools import TTLCache

class FirebaseLocation:
    def __init__(self):
        # Realtime DB cho location tracking
        self.rtdb = db
        # Firestore cho user data
        self.firestore = firestore.client()
        # WebSocket connections
        self.active_connections: Dict[str, WebSocket] = {}
        # Cache cho user info để giảm số query đến Firestore
        self.user_cache = TTLCache(maxsize=1000, ttl=300)  # Cache 5 phút
        
        self.NEARBY_RADIUS_KM = 1.0  # Bán kính tìm kiếm (km)
        self.INACTIVE_TIMEOUT = 900   # Thời gian để xem user không hoạt động (5 phút)
        self.CLEANUP_INTERVAL = 300    # Interval cho cleanup task (1 phút)

        self._initialize_database()
    
    def _initialize_database(self):
        """Khởi tạo cấu trúc cho Realtime Database"""
        try:
            root_ref = self.rtdb.reference('/')
            locations_ref = root_ref.child('locations')
            if not locations_ref.get():
                locations_ref.set({})

        except Exception as e:
            print(f"Database initialization error: {str(e)}")

    async def _get_user_info(self, uid: str) -> Dict:
        """Lấy user info từ cache hoặc Firestore"""
        try:
            # Kiểm tra cache trước
            if uid in self.user_cache:
                return self.user_cache[uid]

            # Nếu không có trong cache, query từ Firestore
            user_doc = self.firestore.collection('users').document(uid).get()
            if user_doc.exists:
                user_data = user_doc.to_dict()
                user_info = {
                    'displayName': user_data.get('displayName', ''),
                    'profileImage': user_data.get('profileImage', None),
                    'email': user_data.get('email', '')
                }
                # Lưu vào cache
                self.user_cache[uid] = user_info
                return user_info
            return {}
        except Exception as e:
            print(f"Error getting user info: {str(e)}")
            return {}

    def _clear_user_cache(self, uid: str):
        """Xóa cache khi user data thay đổi"""
        if uid in self.user_cache:
            del self.user_cache[uid]

    async def connect(self, websocket: WebSocket, uid: str):
        """Xử lý kết nối WebSocket mới"""
        await websocket.accept()
        self.active_connections[uid] = websocket

        # Lấy thông tin user từ Firestore
        user_info = await self._get_user_info(uid)

        # Cập nhật status trong Realtime DB
        location_ref = self.rtdb.reference(f"locations/{uid}")
        location_ref.update({
            'info': user_info,
            'status': {
                'online': True,
                'last_seen': datetime.now().isoformat(),
                'connected_at': datetime.now().isoformat()
            },
            'device_info': {
                'platform': 'mobile',
                'last_activity': datetime.now().isoformat()
            }
        })

    async def update_location(self, id: str, location: Dict):
        """Cập nhật vị trí của user trong Realtime DB"""
        try:
            required_fields = ['latitude', 'longitude']
            if not all(field in location for field in required_fields):
                raise ValueError("Missing required location fields")

            if not (-90 <= location['latitude'] <= 90) or not (-180 <= location['longitude'] <= 180):
                raise ValueError("Invalid coordinates")

            timestamp = datetime.now().isoformat()

            # Cập nhật vị trí trong Realtime DB
            location_ref = self.rtdb.reference(f'locations/{id}')
            updates = {
                'position': {
                    'latitude': location['latitude'],
                    'longitude': location['longitude'],
                    'accuracy': location.get('accuracy', 0),
                    'heading': location.get('heading', 0),
                    'speed': location.get('speed', 0),
                    'timestamp': timestamp
                },
                'device_info': {
                    'last_activity': timestamp,
                    'platform': 'mobile'
                },
                'status': {
                    'online': True,
                    'last_seen': timestamp
                }
            }
            location_ref.update(updates)
            return timestamp
        except Exception as e:
            print(f"Error updating location: {str(e)}")
            raise e

    
    async def notify_nearby_users(self, uid: str, location: Dict, timestamp: str):
        """Tìm và thông báo cho các users trong vùng lân cận"""
        try:
            # Tìm users trong phạm vi 1km
            nearby_users = await self.get_nearby_users(uid)
            user_info = await self._get_user_info(uid)

            # Broadcast cho mỗi nearby user
            for nearby_user in nearby_users:
                other_id = nearby_user['user_id']
                if other_id in self.active_connections:
                    await self.active_connections[other_id].send_json({
                        'type': 'location_update',
                        'id': uid,
                        'info': user_info,
                        'location': {
                            'latitude': location['latitude'],
                            'longitude': location['longitude'],
                            'timestamp': timestamp,
                            'accuracy': location.get('accuracy'),
                            'heading': location.get('heading'),
                            'speed': location.get('speed')
                        },
                        'distance': nearby_user['distance'],
                        'status': 'active'
                    })

        except Exception as e:
            print(f"Error notifying nearby users: {str(e)}")
            if uid in self.active_connections:
                await self.active_connections[uid].send_json({
                    'type': 'error',
                    'message': 'Failed to notify nearby users'
                })

    async def broadcast_location(self, uid: str, location: Dict):
        """Broadcast location cho nearby users"""
        try:
            # Bước 1: Cập nhật vị trí
            print("Updating location")
            timestamp = await self.update_location(uid, location)
            
            # Bước 2: Thông báo cho nearby users
            print("Notify nearby users")
            await self.notify_nearby_users(uid, location, timestamp)

        except Exception as e:
            print(f"Error broadcasting location: {str(e)}")
            if uid in self.active_connections:
                await self.active_connections[uid].send_json({
                    'type': 'error',
                    'message': 'Failed to broadcast location'
                })

    async def get_nearby_users(self, uid: str) -> List[Dict]:
        """Tìm users trong bán kính 1km"""
        try:
            def get_current_location(current_data):
                if not current_data or 'position' not in current_data:
                    return None
                return current_data
            

            print('[DEBUG]: Getting current user info')
            # Lấy vị trí hiện tại từ Realtime DB
            user_location = self.rtdb.reference(f"locations/{uid}").transaction(get_current_location)
            print('[DEBUG]: Got current user info successfully')
            
            if not user_location:
                return []
            
            print('[DEBUG]: Getting current user location')
            user_pos = user_location['position']
            current_location = (user_pos['latitude'], user_pos['longitude'])
            print(f'[DEBUG]: Got current user location successfully: {current_location}')
            
            nearby_users = []

            def get_all_users(current_data):
                if not current_data:
                    return current_data
                
                current_time = datetime.now()
                modified_data = current_data.copy()

                for other_id, other_data in current_data.items():
                    if other_id != uid and 'position' in other_data:
                        # Kiểm tra và update trạng thái hoạt động
                        device_info = other_data.get('device_info', {})
                        last_activity_str = device_info.get('last_activity', '')
                        
                        if last_activity_str:
                            last_activity = datetime.fromisoformat(last_activity_str)
                            is_online = (current_time - last_activity).total_seconds() <= 300
                            
                            # Chỉ update status nếu có thay đổi
                            if other_data.get('status', {}).get('online') != is_online:
                                modified_data[other_id] = {
                                    **other_data,
                                    'status': {
                                        'online': is_online,
                                        'last_seen': datetime.isoformat(last_activity)
                                    }
                                }

                return modified_data

            print('[DEBUG]: Getting other users info that are online')

            users_data = self.rtdb.reference('locations').transaction(get_all_users)

            print(f'[DEBUG]: Got other users info successfully: {users_data}')

            if users_data:
                for other_id, other_data in users_data.items():
                    if other_id != uid and 'position' in other_data:
                        other_pos = other_data['position']
                        other_location = (other_pos['latitude'], other_pos['longitude'])
                        distance = geodesic(current_location, other_location).km

                        if distance <= self.NEARBY_RADIUS_KM:
                            other_user_info = await self._get_user_info(other_id)
                            nearby_users.append({
                                'id': other_id,
                                'info': other_user_info,
                                'location': {
                                    'latitude': other_pos['latitude'],
                                    'longitude': other_pos['longitude']
                                },
                                'distance': round(distance, 2),
                                'last_updated': other_pos.get('timestamp'),
                                'status': other_data.get('status', {
                                    'online': False,
                                    'last_seen': datetime.now().isoformat()
                                })
                            })

            return sorted(nearby_users, key=lambda x: x['distance'])

        except Exception as e:
            print(f"Error getting nearby users: {str(e)}")
            return []

    def disconnect(self, uid: str):
        """Xử lý ngắt kết nối"""
        if uid in self.active_connections:
            del self.active_connections[uid]
        
        try:
            # Cập nhật status trong Realtime DB
            location_ref = self.rtdb.reference(f'locations/{uid}')
            location_ref.update({
                'status': {
                    'online': False,
                    'last_seen': datetime.now().isoformat(),
                    'disconnected_at': datetime.now().isoformat()
                }
            })
            # Xóa cache
            self._clear_user_cache(uid)
        except Exception as e:
            print(f"Error updating disconnect status: {str(e)}")

    async def cleanup_offline_users(self):
        """Task định kỳ dọn dẹp users không hoạt động"""
        while True:
            try:
                def transaction(current_data):
                    if not current_data:
                        return current_data
                    
                    current_time = datetime.now()
                    modified_data = current_data.copy()


                    for uid, user_data in current_data.items():
                        try:
                            device_info = user_data.get('device_info', {})
                            last_activity_str = device_info.get('last_activity')
                            status = user_data.get('status', {})

                            if last_activity_str and status.get('online', False):
                                try:
                                    last_activity = datetime.fromisoformat(last_activity_str)
                                    inactive_duration = (current_time - last_activity).total_seconds()

                                    if inactive_duration > self.INACTIVE_TIMEOUT:
                                        print(f"User {uid} inactive for {inactive_duration} seconds")
                                        modified_data[uid] = {
                                            **user_data,
                                            'status': {
                                                'online': False,
                                                'last_seen': datetime.isoformat(last_activity),
                                                'disconnected_at': current_time.isoformat()
                                            }
                                        }
                                except ValueError as e:
                                    print(f"Error parsing date for user {uid}: {e}")
                                    continue
                        except Exception as e:
                            print(f"Error processing user {uid}: {e}")
                            continue
                    
                    return modified_data

                result = self.rtdb.reference('locations').transaction(transaction)
                if result:
                    print("Cleanup transaction completed:", result)

            except Exception as e:
                print(f"Cleanup error details: {str(e)}")

            await asyncio.sleep(self.CLEANUP_INTERVAL)

    async def update_user_info(self, uid: str):
        """Cập nhật user info trong Realtime DB khi thông tin user thay đổi"""
        try:
            # Xóa cache cũ
            self._clear_user_cache(uid)
            # Lấy thông tin mới từ Firestore
            user_info = await self._get_user_info(uid)
            # Cập nhật trong Realtime DB
            location_ref = self.rtdb.reference(f'locations/{uid}')
            location_ref.update({
                'info': user_info
            })
        except Exception as e:
            print(f"Error updating user info: {str(e)}")