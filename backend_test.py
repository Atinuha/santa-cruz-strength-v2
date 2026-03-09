import requests
import sys
from datetime import datetime
import json
import os

class SantaCruzStrengthAPITester:
    def __init__(self, base_url="https://santa-cruz-dev.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_credentials = {
            "email": "management@santacruzstrength.com",
            "password": "SCS@admin2024!"
        }
        self.created_lead_id = None
        self.created_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        return True, response.json()
                    except:
                        return True, {}
                else:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:500]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=self.admin_credentials
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   🔑 Got token: {self.token[:20]}...")
            return True
        return False

    def test_staff_me_endpoint(self):
        """Test getting staff user info"""
        return self.run_test(
            "Get Staff Me",
            "GET",
            "staff/me",
            200
        )[0]

    def test_create_public_lead(self):
        """Test creating a lead via public endpoint"""
        lead_data = {
            "first_name": f"Test",
            "last_name": f"User{datetime.now().strftime('%H%M%S')}",
            "email": f"test{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "(831) 555-0100",
            "interest_type": "General Membership",
            "training_goals": "Get stronger",
            "start_timeline": "ASAP",
            "preferred_contact": "call",
            "lead_source": "website_form"
        }
        
        success, response = self.run_test(
            "Create Public Lead",
            "POST",
            "leads",
            200,
            data=lead_data,
            headers={} # No auth needed for public endpoint
        )
        
        if success and 'id' in response:
            self.created_lead_id = response['id']
            print(f"   📝 Created lead ID: {self.created_lead_id}")
        
        return success

    def test_list_leads(self):
        """Test listing leads"""
        return self.run_test(
            "List Staff Leads",
            "GET",
            "staff/leads",
            200
        )[0]

    def test_get_lead_detail(self):
        """Test getting lead details"""
        if not self.created_lead_id:
            print("⚠️ No lead ID available for detail test")
            return False
        
        return self.run_test(
            "Get Lead Detail",
            "GET",
            f"staff/leads/{self.created_lead_id}",
            200
        )[0]

    def test_update_lead_status(self):
        """Test updating lead status"""
        if not self.created_lead_id:
            print("⚠️ No lead ID available for update test")
            return False
        
        return self.run_test(
            "Update Lead Status",
            "PUT",
            f"staff/leads/{self.created_lead_id}",
            200,
            data={"status": "Contacted"}
        )[0]

    def test_add_lead_note(self):
        """Test adding a note to a lead"""
        if not self.created_lead_id:
            print("⚠️ No lead ID available for note test")
            return False
        
        return self.run_test(
            "Add Lead Note",
            "POST",
            f"staff/leads/{self.created_lead_id}/notes",
            200,
            data={"note": "Test note added via API"}
        )[0]

    def test_create_manual_lead(self):
        """Test creating a manual lead via staff endpoint"""
        lead_data = {
            "first_name": "Manual",
            "last_name": f"Lead{datetime.now().strftime('%H%M%S')}",
            "email": f"manual{datetime.now().strftime('%H%M%S')}@test.com",
            "phone": "(831) 555-0200",
            "interest_type": "Personal Training",
            "notes": "Created manually via API test"
        }
        
        return self.run_test(
            "Create Manual Lead",
            "POST",
            "staff/leads",
            200,
            data=lead_data
        )[0]

    def test_get_stats(self):
        """Test getting CRM stats"""
        return self.run_test(
            "Get CRM Stats",
            "GET",
            "staff/stats",
            200
        )[0]

    def test_export_csv(self):
        """Test CSV export functionality"""
        success, response = self.run_test(
            "Export Leads CSV",
            "GET",
            "staff/leads/export/csv",
            200
        )
        
        if success and isinstance(response, str) and 'first_name' in response:
            print("   📊 CSV export contains expected headers")
            return True
        return False

    def test_create_staff_user(self):
        """Test creating a new staff user"""
        user_data = {
            "name": f"Test Staff {datetime.now().strftime('%H%M%S')}",
            "email": f"staff{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "role": "staff"
        }
        
        success, response = self.run_test(
            "Create Staff User",
            "POST",
            "staff/users",
            200,
            data=user_data
        )
        
        if success and 'id' in response:
            self.created_user_id = response['id']
            print(f"   👤 Created user ID: {self.created_user_id}")
        
        return success

    def test_list_staff_users(self):
        """Test listing staff users"""
        return self.run_test(
            "List Staff Users",
            "GET",
            "staff/users",
            200
        )[0]

    def test_update_profile(self):
        """Test updating own profile"""
        return self.run_test(
            "Update Staff Profile",
            "PUT",
            "staff/me",
            200,
            data={"name": "Admin Updated"}
        )[0]

def main():
    print("🏋️‍♂️ Santa Cruz Strength API Test Suite")
    print("=" * 50)
    
    tester = SantaCruzStrengthAPITester()
    
    # Authentication tests
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    if not tester.test_staff_me_endpoint():
        print("❌ Staff me endpoint failed")
        return 1
    
    # Lead management tests
    print("\n📝 Testing Lead Management...")
    tester.test_create_public_lead()
    tester.test_list_leads()
    tester.test_get_lead_detail()
    tester.test_update_lead_status()
    tester.test_add_lead_note()
    tester.test_create_manual_lead()
    
    # Stats and export tests
    print("\n📊 Testing Stats & Export...")
    tester.test_get_stats()
    tester.test_export_csv()
    
    # Staff management tests (admin only)
    print("\n👥 Testing Staff Management...")
    tester.test_create_staff_user()
    tester.test_list_staff_users()
    tester.test_update_profile()
    
    # Print results
    print(f"\n📊 Test Results:")
    print(f"   Tests run: {tester.tests_run}")
    print(f"   Tests passed: {tester.tests_passed}")
    print(f"   Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("✅ All tests passed!")
        return 0
    else:
        failed = tester.tests_run - tester.tests_passed
        print(f"❌ {failed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())