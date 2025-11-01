# backend/test_rate_limiter.py - Test Rate Limiting
from utils.rate_limiter import rate_limiter
import time

def test_rate_limiter():
    """Test rate limiting functionality"""
    teacher_id = 123
    
    print("🧪 Testing Rate Limiter (Limit: 80/hour)\n")
    
    # Test 1: Normal usage (10 requests)
    print("Test 1: Normal usage (10 requests)")
    for i in range(10):
        allowed, message, remaining = rate_limiter.check_limit(teacher_id, limit=80)
        print(f"Request {i+1}: {message} - Remaining: {remaining}")
    
    print("\nTest 2: Approaching limit (70 more requests)")
    for i in range(70):
        allowed, message, remaining = rate_limiter.check_limit(teacher_id, limit=80)
    print(f"After 80 requests: Remaining = {remaining}")
    
    print("\nTest 3: Exceeding limit (Should block)")
    allowed, message, remaining = rate_limiter.check_limit(teacher_id, limit=80)
    if not allowed:
        print(f"✅ Blocked as expected: {message}")
    else:
        print("❌ ERROR: Should have been blocked!")
    
    print("\nTest 4: Check status")
    status = rate_limiter.get_status(teacher_id)
    print(f"Status: {status}")
    
    print("\nTest 5: Reset user")
    rate_limiter.reset_user(teacher_id)
    status = rate_limiter.get_status(teacher_id)
    print(f"After reset: {status}")
    
    print("\n✅ Rate limiter tests complete!")

if __name__ == "__main__":
    test_rate_limiter()
