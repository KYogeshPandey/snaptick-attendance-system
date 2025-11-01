# backend/utils/rate_limiter.py - Rate Limiting Utility (80 requests/hour)
from datetime import datetime, timedelta
from threading import Lock

class RateLimiter:
    """
    Rate limiter for API endpoints
    Tracks requests per user with time-based reset
    """
    
    def __init__(self):
        self.storage = {}
        self.lock = Lock()
    
    def check_limit(self, user_id, limit=80, window_minutes=60):
        """
        Check if user has exceeded rate limit
        
        Args:
            user_id: Unique identifier (teacher_id)
            limit: Maximum requests allowed (default: 80)
            window_minutes: Time window in minutes (default: 60)
        
        Returns:
            tuple: (allowed: bool, message: str, remaining: int)
        """
        with self.lock:
            now = datetime.now()
            user_key = f"user_{user_id}"
            
            # Initialize if not exists
            if user_key not in self.storage:
                self.storage[user_key] = {
                    'count': 0,
                    'reset_time': now + timedelta(minutes=window_minutes)
                }
            
            data = self.storage[user_key]
            
            # Reset if window expired
            if now >= data['reset_time']:
                data['count'] = 0
                data['reset_time'] = now + timedelta(minutes=window_minutes)
            
            # Check if limit exceeded
            if data['count'] >= limit:
                time_left = data['reset_time'] - now
                minutes_left = int(time_left.total_seconds() / 60)
                seconds_left = int(time_left.total_seconds() % 60)
                
                reset_time_str = data['reset_time'].strftime('%I:%M %p')
                
                message = (
                    f"Rate limit exceeded. You've made {limit} face recognition requests in the last hour. "
                    f"Please try again in {minutes_left} minutes {seconds_left} seconds "
                    f"(at {reset_time_str})."
                )
                
                return False, message, 0
            
            # Increment count
            data['count'] += 1
            remaining = limit - data['count']
            
            message = f"Request {data['count']}/{limit}. Remaining: {remaining}"
            
            return True, message, remaining
    
    def get_status(self, user_id):
        """Get current rate limit status for user"""
        user_key = f"user_{user_id}"
        
        if user_key not in self.storage:
            return {'count': 0, 'limit': 80, 'remaining': 80, 'reset_time': None}
        
        data = self.storage[user_key]
        now = datetime.now()
        
        # Check if expired
        if now >= data['reset_time']:
            return {'count': 0, 'limit': 80, 'remaining': 80, 'reset_time': None}
        
        return {
            'count': data['count'],
            'limit': 80,
            'remaining': 80 - data['count'],
            'reset_time': data['reset_time'].strftime('%Y-%m-%d %I:%M %p')
        }
    
    def reset_user(self, user_id):
        """Manually reset rate limit for a user (admin function)"""
        user_key = f"user_{user_id}"
        if user_key in self.storage:
            del self.storage[user_key]
            return True
        return False


# Global instance
rate_limiter = RateLimiter()
