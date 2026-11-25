#!/bin/bash
set -e
API="http://localhost:5000/api"

login() {
  curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])"
}

ADMIN_TOKEN=$(login "admin@jipange.com" "Jipange_1234")
echo "Admin token acquired."

register_inst_admin() {
  local fullName="$1" email="$2" phone="$3" password="$4"
  curl -s -X POST "$API/auth/register" -H "Content-Type: application/json" \
    -d "{\"fullName\":\"$fullName\",\"email\":\"$email\",\"phone\":\"$phone\",\"password\":\"$password\",\"role\":\"institution_admin\"}"
}

create_institution() {
  local token="$1" name="$2" category="$3" desc="$4" address="$5" phone="$6" email="$7"
  curl -s -X POST "$API/institutions" -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
    -d "{\"name\":\"$name\",\"category\":\"$category\",\"description\":\"$desc\",\"address\":\"$address\",\"phone\":\"$phone\",\"email\":\"$email\"}"
}

approve_institution() {
  local id="$1"
  curl -s -X PATCH "$API/institutions/admin/$id/status" -H "Content-Type: application/json" -H "Authorization: Bearer $ADMIN_TOKEN" \
    -d "{\"status\":\"active\"}"
}

add_service() {
  local token="$1" name="$2" desc="$3" duration="$4" price="$5"
  curl -s -X POST "$API/services" -H "Content-Type: application/json" -H "Authorization: Bearer $token" \
    -d "{\"name\":\"$name\",\"description\":\"$desc\",\"durationMinutes\":$duration,\"price\":$price}"
}

echo "=== 1. Kenyatta National Hospital - Outpatient Wing ==="
register_inst_admin "James Mwangi" "admin@knh-outpatient-demo.co.ke" "0711000001" "Demo@Pass1!" > /dev/null
TOK1=$(login "admin@knh-outpatient-demo.co.ke" "Demo@Pass1!")
INST1=$(create_institution "$TOK1" "Kenyatta National Hospital - Outpatient Wing" "Hospital" \
  "Public referral hospital outpatient department offering general and specialist consultations, diagnostics and dental care." \
  "Hospital Road, Upper Hill, Nairobi" "0711000001" "admin@knh-outpatient-demo.co.ke")
ID1=$(echo "$INST1" | python3 -c "import sys,json; print(json.load(sys.stdin)['institution']['id'])")
approve_institution "$ID1" > /dev/null
add_service "$TOK1" "General Consultation" "Initial assessment with a general practitioner." 30 500 > /dev/null
add_service "$TOK1" "Laboratory Testing" "Blood work and diagnostic sample collection." 20 800 > /dev/null
add_service "$TOK1" "Specialist Referral Consultation" "Follow-up with a specialist such as cardiology or orthopaedics." 45 1500 > /dev/null
add_service "$TOK1" "Dental Checkup" "Routine dental examination and cleaning." 40 1000 > /dev/null
echo "Created institution ID $ID1"

echo "=== 2. Equity Bank - Westlands Branch ==="
register_inst_admin "Grace Wambui" "admin@equity-westlands-demo.co.ke" "0711000002" "Demo@Pass2!" > /dev/null
TOK2=$(login "admin@equity-westlands-demo.co.ke" "Demo@Pass2!")
INST2=$(create_institution "$TOK2" "Equity Bank - Westlands Branch" "Bank" \
  "Full-service retail and business banking branch offering accounts, loans, diaspora banking and forex services." \
  "Westlands Road, Nairobi" "0711000002" "admin@equity-westlands-demo.co.ke")
ID2=$(echo "$INST2" | python3 -c "import sys,json; print(json.load(sys.stdin)['institution']['id'])")
approve_institution "$ID2" > /dev/null
add_service "$TOK2" "Account Opening" "New personal or business account setup." 30 0 > /dev/null
add_service "$TOK2" "Loan Application Consultation" "Discussion of loan products and eligibility." 45 0 > /dev/null
add_service "$TOK2" "Diaspora Banking Desk" "Support for international and remote account holders." 30 0 > /dev/null
add_service "$TOK2" "Forex Transaction Assistance" "Currency exchange and international transfer support." 15 0 > /dev/null
echo "Created institution ID $ID2"

echo "=== 3. Huduma Centre GPO ==="
register_inst_admin "Peter Otieno" "admin@hudumagpo-demo.go.ke" "0711000003" "Demo@Pass3!" > /dev/null
TOK3=$(login "admin@hudumagpo-demo.go.ke" "Demo@Pass3!")
INST3=$(create_institution "$TOK3" "Huduma Centre GPO" "Government" \
  "One-stop government service centre offering ID, passport, NHIF, NSSF and business permit services." \
  "GPO, Kenyatta Avenue, Nairobi" "0711000003" "admin@hudumagpo-demo.go.ke")
ID3=$(echo "$INST3" | python3 -c "import sys,json; print(json.load(sys.stdin)['institution']['id'])")
approve_institution "$ID3" > /dev/null
add_service "$TOK3" "National ID Application" "New ID or replacement processing." 25 300 > /dev/null
add_service "$TOK3" "Passport Application" "New or renewal passport processing." 30 4550 > /dev/null
add_service "$TOK3" "NHIF Registration" "National health insurance enrolment." 20 0 > /dev/null
add_service "$TOK3" "NSSF Services" "Pension and social security account queries and updates." 20 0 > /dev/null
add_service "$TOK3" "Business Permit Application" "Single business permit processing." 30 0 > /dev/null
echo "Created institution ID $ID3"

echo "=== 4. University of Nairobi - Student Registration Office ==="
register_inst_admin "Faith Njeri" "admin@uon-registration-demo.ac.ke" "0711000004" "Demo@Pass4!" > /dev/null
TOK4=$(login "admin@uon-registration-demo.ac.ke" "Demo@Pass4!")
INST4=$(create_institution "$TOK4" "University of Nairobi - Student Registration Office" "University" \
  "Student registration and records office handling course registration, transcripts, fees and admissions enquiries." \
  "University Way, Nairobi" "0711000004" "admin@uon-registration-demo.ac.ke")
ID4=$(echo "$INST4" | python3 -c "import sys,json; print(json.load(sys.stdin)['institution']['id'])")
approve_institution "$ID4" > /dev/null
add_service "$TOK4" "Course Registration" "Semester unit registration assistance." 20 0 > /dev/null
add_service "$TOK4" "Transcript Request" "Official academic transcript processing." 15 500 > /dev/null
add_service "$TOK4" "Fee Structure Consultation" "Financial queries and payment plan discussion." 25 0 > /dev/null
add_service "$TOK4" "Admission Enquiry" "Prospective student admission guidance." 30 0 > /dev/null
echo "Created institution ID $ID4"

echo "=== 5. Nairobi Hospital - Dental and Optical Clinic ==="
register_inst_admin "Susan Achieng" "admin@nbihospital-dentaloptical-demo.co.ke" "0711000005" "Demo@Pass5!" > /dev/null
TOK5=$(login "admin@nbihospital-dentaloptical-demo.co.ke" "Demo@Pass5!")
INST5=$(create_institution "$TOK5" "Nairobi Hospital - Dental and Optical Clinic" "Hospital" \
  "Private specialist clinic offering eye examinations, dental consultations and optical fitting services." \
  "Argwings Kodhek Road, Nairobi" "0711000005" "admin@nbihospital-dentaloptical-demo.co.ke")
ID5=$(echo "$INST5" | python3 -c "import sys,json; print(json.load(sys.stdin)['institution']['id'])")
approve_institution "$ID5" > /dev/null
add_service "$TOK5" "Eye Examination" "Comprehensive vision test and screening." 30 1500 > /dev/null
add_service "$TOK5" "Dental Consultation" "General dental checkup." 30 1200 > /dev/null
add_service "$TOK5" "Minor Dental Procedure" "Fillings, extractions and similar procedures." 60 3500 > /dev/null
add_service "$TOK5" "Optical Fitting" "Prescription glasses or contact lens fitting." 25 1000 > /dev/null
echo "Created institution ID $ID5"

echo "=== 6. Nairobi City County - Single Business Permit Office ==="
register_inst_admin "Daniel Kiptoo" "admin@nairobicounty-permits-demo.go.ke" "0711000006" "Demo@Pass6!" > /dev/null
TOK6=$(login "admin@nairobicounty-permits-demo.go.ke" "Demo@Pass6!")
INST6=$(create_institution "$TOK6" "Nairobi City County - Single Business Permit Office" "Government" \
  "County office handling business permit renewals, new business registration, land rates queries and fire safety inspections." \
  "City Hall, Nairobi" "0711000006" "admin@nairobicounty-permits-demo.go.ke")
ID6=$(echo "$INST6" | python3 -c "import sys,json; print(json.load(sys.stdin)['institution']['id'])")
approve_institution "$ID6" > /dev/null
add_service "$TOK6" "Business Permit Renewal" "Annual permit renewal processing." 20 0 > /dev/null
add_service "$TOK6" "New Business Registration" "First-time business registration." 35 0 > /dev/null
add_service "$TOK6" "Land Rates Payment Query" "Property rate verification and payment assistance." 20 0 > /dev/null
add_service "$TOK6" "Fire Safety Inspection Booking" "Scheduling a compliance inspection." 15 0 > /dev/null
echo "Created institution ID $ID6"

echo "=== DONE ==="
