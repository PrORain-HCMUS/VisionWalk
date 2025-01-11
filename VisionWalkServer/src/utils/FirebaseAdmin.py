import firebase_admin
from firebase_admin import credentials, firestore, storage, auth
from typing import Dict, Optional, Union
import os
from datetime import datetime
from fastapi import HTTPException
import uuid
import bcrypt
from jose import JWTError, jwt
from datetime import timedelta

class FirebaseAdmin:
    def __init__(self, credentials_path: str):
        if not len(firebase_admin._apps):
            cred = credentials.Certificate(credentials_path)
            firebase_admin.initialize_app(cred, {
                'storageBucket': 'vivibe-108ba.firebasestorage.app',
                'databaseURL': 'https://vivibe-108ba-default-rtdb.firebaseio.com/'
            })
        
        self.db = firestore.client()
        self.bucket = storage.bucket()
        self.users_collection = self.db.collection('users')
        self.secret_key = os.getenv("JWT_SECRET_KEY", "ptktntbh@27010803")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 24 * 30  # 30 days
        self.refresh_token_expire_minutes = 60 * 24 * 365  # 1 year

    def _create_token(self, data: Dict, expire_minutes: int, token_type: str = "access") -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=expire_minutes)
        to_encode.update({
            "exp": expire,
            "type": token_type,
            "iat": datetime.utcnow()
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def create_tokens(self, user_data: Dict) -> Dict[str, str]:
        token_data = {
            "id": user_data["id"],
            "email": user_data["email"],
            "role": user_data.get("role", "user"),
            "phoneNumber": user_data["phoneNumber"]
        }
        
        access_token = self._create_token(
            token_data, 
            self.access_token_expire_minutes, 
            "access"
        )
        refresh_token = self._create_token(
            token_data, 
            self.refresh_token_expire_minutes, 
            "refresh"
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    def verify_token(self, token: str) -> Dict:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials"
            )

    async def register_user(self, email: str, password: str, user_data: Dict, profile_image_file: Optional[bytes] = None) -> Dict:
        try:
            users_ref = self.users_collection.where("email", "==", email)
            if len(list(users_ref.stream())) > 0:
                raise HTTPException(status_code=400, detail="Email already registered")

            profile_image_url = None
            if profile_image_file:
                try:
                    profile_image_url = await self.upload_image(
                        profile_image_file,
                        folder="profileImages"
                    )
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Failed to upload profile image: {str(e)}")

            
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

            user_id = str(uuid.uuid4())
            user_doc = {
                'id': user_id,
                'email': email,
                'password': hashed_password.decode('utf-8'),
                'salt': salt.decode('utf-8'),
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                "phoneNumber": user_data.get("phoneNumber", None),
                'profileImage': profile_image_url,
                'displayName': user_data.get('displayName', None),
                'role': 'user',
                'is_active': True
            }

            self.users_collection.document(user_id).set(user_doc)

            tokens = self.create_tokens(user_doc)

            return {
                "user": {
                    'id': user_id,
                    'email': email,
                    'profileImage': profile_image_url,
                    'displayName': user_data.get('displayName'),
                    'phoneNumber': user_data.get('phoneNumber'),
                },
                **tokens,
                'message': 'User registered successfully'
            }

        except Exception as e:
            print(str(e))
            raise HTTPException(status_code=400, detail=str(e))

    async def login_user(self, email: str, password: str) -> Dict:
        try:
            users_ref = self.users_collection.where("email", "==", email)
            users = list(users_ref.stream())
            
            if not users:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            user_doc = users[0].to_dict()
            
            stored_password = user_doc['password'].encode('utf-8')
            if not bcrypt.checkpw(password.encode('utf-8'), stored_password):
                raise HTTPException(status_code=401, detail="Invalid credentials")

            if not user_doc.get('is_active', True):
                raise HTTPException(status_code=400, detail="Account is deactivated")

            tokens = self.create_tokens(user_doc)

            return {
                'user': {
                    'id': user_doc['id'],
                    'email': email,
                    'profileImage': user_doc.get('profileImage'),
                    'displayName': user_doc.get('displayName'),
                    'phoneNumber': user_doc.get('phoneNumber')
                },
                **tokens,
                'message': "User login successfully"
            }

        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def refresh_tokens(self, refresh_token: str) -> Dict[str, str]:
        try:
            # Verify refresh token
            payload = self.verify_token(refresh_token)
            
            if payload["type"] != "refresh":
                raise HTTPException(status_code=401, detail="Invalid token type")
            
            # Get user data
            user_doc = await self.users_collection.document(payload["id"]).get()
            if not user_doc.exists:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_data = user_doc.to_dict()
            
            return self.create_tokens(user_data)
            
        except Exception as e:
            raise HTTPException(status_code=401, detail=str(e))

    async def upload_image(self, file_bytes: bytes, folder: str = "images") -> str:
        try:
            filename = f"{uuid.uuid4()}.jpg"
            file_path = f"{folder}/{filename}"

            blob = self.bucket.blob(file_path)
            blob.upload_from_string(
                file_bytes,
                content_type='image/jpeg'
            )

            blob.make_public()

            return blob.public_url

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

    async def update_user_profile(self, id: str, update_data: Dict) -> Dict:
        try:
            user_ref = self.users_collection.document(id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                raise HTTPException(status_code=404, detail="User not found")

            update_data['updated_at'] = datetime.now()

            if 'profileImage_file' in update_data:
                image_url = await self.upload_image(
                    update_data['profileImage_file'],
                    folder="profileImages"
                )
                update_data['profileImage'] = image_url
                del update_data['profileImage_file']

            user_ref.update(update_data)

            updated_user = user_ref.get()
            return updated_user.to_dict()

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    def get_user_profile(self, id: str) -> Dict:
        try:
            user_doc = self.users_collection.document(id).get()
            if not user_doc.exists:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_data = user_doc.to_dict()
            return {
                'id': id,
                'profileImage': user_data.get('profileImage'),
                'role': user_data.get('role'),
                'displayName': user_data.get('displayName'),
                'email': user_data.get('email'),
                'phoneNumber': user_data.get('phoneNumber')
            }

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    async def delete_user(self, id: str) -> Dict:
        try:
            user_ref = self.users_collection.document(id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                raise HTTPException(status_code=404, detail="User not found")
                
            user_ref.delete()
            return {'message': 'User deleted successfully'}

        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
