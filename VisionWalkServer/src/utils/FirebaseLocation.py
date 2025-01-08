import firebase_admin, asyncio, json
from firebase_admin import credentials, db
from typing import Dict, List, Optional
from datetime import datetime
from geopy.distance import geodesic
from fastapi import WebSocket

class FirebaseLocation:
    def __init__(self, credentials_path: str):
        cred = credentials.Certificate(credentials_path)
        if not len(firebase_admin._apps):
            firebase_admin.initialize_app(cred, {
                'databaseURL': 'https://vivibe-108ba-default-rtdb.firebaseio.com/'
            })
        
        self.db = db
        self.active_connections: Dict[str, WebSocket] = {}

        self._initialize_database()
    
    def _initialize_database(self):
        try:
            root_ref = self.db.reference('/')
            locations_ref = root_ref.child('locations')
            if not locations_ref.get():
                locations_ref.set({})

            locations_ref.child('.indexOn').set([
                "position/latitude",
                "position/longitude",
                "status/online"
            ])
        except Exception as e:
            print(f"Database initialization error: {str(e)}")

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

        user_ref = self.db.reference(f"locations/{user_id}")
        user_ref.update({
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

    async def broadcast_location(self, user_id: str, location: Dict):
        try:
            current_location = (location['latitude'], location['longitude'])
            timestamp = datetime.now().isoformat()

            user_ref = self.db.reference(f'locations/{user_id}')
            user_ref.update({
                'position': {
                    'latitude': location['latitude'],
                    'longitude': location['longitude'],
                    'accuracy': location.get('accuracy', 0),
                    'heading': location.get('heading', 0),
                    'speed': location.get('speed', 0),
                    'timestamp': timestamp
                },
                'device_info/last_activity': timestamp
            })

            all_locations = self.db.reference('locations')\
                            .order_by_child('status/online')\
                            .equal_to(True)\
                            .get()

            if all_locations:
                for other_id, other_data in all_locations.items():
                    if other_id != user_id and 'position' in other_data:
                        other_pos = other_data['position']
                        other_location = (other_pos['latitude'], other_pos['longitude'])
                        distance = geodesic(current_location, other_location).km

                        if distance <= 1.0:
                            location_update = {
                                'type': 'location_update',
                                'user_id': user_id,
                                'location': {
                                    'latitude': location['latitude'],
                                    'longitude': location['longitude'],
                                    'timestamp': timestamp,
                                    'accuracy': location.get('accuracy'),
                                    'heading': location.get('heading'),
                                    'speed': location.get('speed')
                                },
                                'distance': round(distance, 2),
                                'status': 'active'
                            }

                            if other_id in self.active_connections:
                                await self.active_connections[other_id].send_json(location_update)

                            if user_id in self.active_connections:
                                await self.active_connections[user_id].send_json({
                                    'type': 'location_update',
                                    'user_id': other_id,
                                    'location': {
                                        'latitude': other_pos['latitude'],
                                        'longitude': other_pos['longitude'],
                                        'timestamp': other_pos['timestamp'],
                                        'accuracy': other_pos.get('accuracy'),
                                        'heading': other_pos.get('heading'),
                                        'speed': other_pos.get('speed')
                                    },
                                    'distance': round(distance, 2),
                                    'status': 'active'
                                })

        except Exception as e:
            print(f"Error broadcasting location: {str(e)}")
            if user_id in self.active_connections:
                await self.active_connections[user_id].send_json({
                    'type': 'error',
                    'message': 'Failed to broadcast location'
                })

    async def get_nearby_users(self, user_id: str) -> List[Dict]:
        try:
            user_location = self.db.reference(f"locations/{user_id}/position").get()
            if not user_location:
                return []
            
            current_location = (user_location['latitude'], user_location['longitude'])
            nearby_users = []

            all_locations = self.db.reference('locations').get()
            if all_locations:
                for other_id, other_data in all_locations.items():
                    if(other_id != user_id and
                        other_data.get('status', {}).get('online', False) and
                    'position' in other_data):
                        other_pos = other_data['position']
                        other_location = (other_pos['latitude'], other_pos['longitude'])
                        distance = geodesic(current_location, other_location).km

                        if distance <= 1.0:
                            nearby_users.append({
                                'user_id': other_id,
                                'location': {
                                    'latitude': other_pos['latitude'],
                                    'longitude': other_pos['longitude']
                                },
                                'distance': round(distance, 2),
                                'last_updated': other_pos['timestamp']
                            })

            return nearby_users

        except Exception as e:
            print(f"Error getting nearby users: {str(e)}")
            return []

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        try:
            user_ref = self.db.reference(f'locations/{user_id}')
            user_ref.update({
                'status': {
                    'online': False,
                    'last_seen': datetime.now().isoformat(),
                    'disconnected_at': datetime.now().isoformat()
                }
            })
        except Exception as e:
            print(f"Error updating disconnect status: {str(e)}")

    async def cleanup_offline_users(self):
        while True:
            try:
                online_users = self.db.reference('locations')\
                                .order_by_child('status/online')\
                                .equal_to(True)\
                                .get()

                if online_users:
                    current_time = datetime.now()
                    for user_id, user_data in online_users.items():
                        last_activity = datetime.fromisoformat(
                            user_data.get('device_info', {}).get('last_activity', '')
                        )
                        
                        if (current_time - last_activity).total_seconds() > 300:
                            self.disconnect(user_id)

            except Exception as e:
                print(f"Cleanup error: {str(e)}")
            
            await asyncio.sleep(60)