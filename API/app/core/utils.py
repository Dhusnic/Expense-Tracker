# utils.py or wherever your Utils class is defined

import base64
import hashlib
import hmac
import re
import time
import random
import threading

class Utils:
    """Utility functions"""
    
    # None list for checking empty values
    none_list = [None, '', 'null', 'undefined', 'None',[], {}, '[]', '{}', 'NULL', 'UNDEFINED',[{}]]
    
    # Thread-safe counter
    _lock = threading.Lock()
    _counter = random.randint(0, 999999)
    
    @staticmethod
    def get_id() -> str:
        """
        Generate unique 24-digit numeric ID
        Thread-safe implementation
        """
        with Utils._lock:
            # Timestamp in microseconds (16 digits)
            timestamp = int(time.time() * 1000000)
            
            # Increment counter (6 digits)
            Utils._counter = (Utils._counter + 1) % 1000000
            
            # Random part (2 digits)
            random_part = random.randint(10, 99)
            
            # Combine: timestamp(16) + counter(6) + random(2) = 24 digits
            return f"{timestamp}{Utils._counter:06d}{random_part:02d}"
    
    @staticmethod
    def is_none(value) -> bool:
        """Check if value is None or empty"""
        return value in Utils.none_list
    
    @staticmethod
    def get_secret_hash(username: str, client_id: str, client_secret: str) -> str:
            message = username + client_id
            dig = hmac.new(
                key=client_secret.encode("utf-8"),
                msg=message.encode("utf-8"),
                digestmod=hashlib.sha256
            ).digest()
            return base64.b64encode(dig).decode()

    @staticmethod
    def normalize_phone(phone: str) -> str:
        phone = re.sub(r'\D', '', phone)
        return f"+{phone}"
# Create instance for easy import
utils = Utils()
