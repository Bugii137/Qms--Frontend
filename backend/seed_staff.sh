#!/bin/bash
set -e
API="http://localhost:5000/api"

login() {
  curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])"
}

add_staff() {
  local token="$1" fullName="$2" email="$3" phone="$4" jobTitle="$5" accessLevel="$6" password="$7"
  curl -s -X POST "$API/staff" -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
    -d "{\"fullName\":\"$fullName\",\"email\":\"$email\",\"phone\":\"$phone\",\"jobTitle\":\"$jobTitle\",\"accessLevel\":\"$accessLevel\",\"password\":\"$password\"}"
}

echo "=== 1. Kenyatta National Hospital - Outpatient Wing ==="
TOK1=$(login "admin@knh-outpatient-demo.co.ke" "Demo@Pass1!")
add_staff "$TOK1" "Alice Wanjiru" "alice.wanjiru@knh-outpatient-demo.co.ke" "0712100001" "Receptionist" "manage_appointments" "StaffDemo1!"
add_staff "$TOK1" "Dr. Brian Kimani" "brian.kimani@knh-outpatient-demo.co.ke" "0712100002" "Doctor" "full_access" "StaffDemo2!"
echo "Staff added."

echo "=== 2. Equity Bank - Westlands Branch ==="
TOK2=$(login "admin@equity-westlands-demo.co.ke" "Demo@Pass2!")
add_staff "$TOK2" "Caroline Njoki" "caroline.njoki@equity-westlands-demo.co.ke" "0712100003" "Receptionist" "manage_appointments" "StaffDemo3!"
add_staff "$TOK2" "David Mutua" "david.mutua@equity-westlands-demo.co.ke" "0712100004" "Administrator" "view_only" "StaffDemo4!"
echo "Staff added."

echo "=== 3. Huduma Centre GPO ==="
TOK3=$(login "admin@hudumagpo-demo.go.ke" "Demo@Pass3!")
add_staff "$TOK3" "Esther Chebet" "esther.chebet@hudumagpo-demo.go.ke" "0712100005" "Receptionist" "manage_appointments" "StaffDemo5!"
add_staff "$TOK3" "Felix Odhiambo" "felix.odhiambo@hudumagpo-demo.go.ke" "0712100006" "Administrator" "full_access" "StaffDemo6!"
add_staff "$TOK3" "Grace Auma" "grace.auma@hudumagpo-demo.go.ke" "0712100007" "Administrator" "view_only" "StaffDemo7!"
echo "Staff added."

echo "=== 4. University of Nairobi - Student Registration Office ==="
TOK4=$(login "admin@uon-registration-demo.ac.ke" "Demo@Pass4!")
add_staff "$TOK4" "Hassan Ali" "hassan.ali@uon-registration-demo.ac.ke" "0712100008" "Receptionist" "manage_appointments" "StaffDemo8!"
add_staff "$TOK4" "Irene Wangari" "irene.wangari@uon-registration-demo.ac.ke" "0712100009" "Administrator" "view_only" "StaffDemo9!"
echo "Staff added."

echo "=== 5. Nairobi Hospital - Dental and Optical Clinic ==="
TOK5=$(login "admin@nbihospital-dentaloptical-demo.co.ke" "Demo@Pass5!")
add_staff "$TOK5" "Joseph Karanja" "joseph.karanja@nbihospital-dentaloptical-demo.co.ke" "0712100010" "Receptionist" "manage_appointments" "StaffDemo10!"
add_staff "$TOK5" "Dr. Lucy Adhiambo" "lucy.adhiambo@nbihospital-dentaloptical-demo.co.ke" "0712100011" "Doctor" "full_access" "StaffDemo11!"
echo "Staff added."

echo "=== 6. Nairobi City County - Single Business Permit Office ==="
TOK6=$(login "admin@nairobicounty-permits-demo.go.ke" "Demo@Pass6!")
add_staff "$TOK6" "Michael Ochieng" "michael.ochieng@nairobicounty-permits-demo.go.ke" "0712100012" "Receptionist" "manage_appointments" "StaffDemo12!"
add_staff "$TOK6" "Nancy Wairimu" "nancy.wairimu@nairobicounty-permits-demo.go.ke" "0712100013" "Administrator" "full_access" "StaffDemo13!"
echo "Staff added."

echo "=== DONE ==="
