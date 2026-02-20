# Analytics Dashboard - Quick Testing Guide

## 🧪 How to Test All Features

### Step 1: Access the Dashboard

1. **Make sure both servers are running:**
   ```bash
   # Check if servers are running
   lsof -i:3000 -i:3001
   
   # If not running, start them:
   cd /home/envisage/Downloads/MEDICAL_LMS/backend
   npm run start:dev
   
   # In another terminal:
   cd /home/envisage/Downloads/MEDICAL_LMS/frontend
   npm run dev
   ```

2. **Open the application:**
   - Navigate to: http://localhost:3000
   - Login with Bitflow Owner credentials:
     - Email: `owner@bitflow.com`
     - Password: `Password123!`

### Step 2: Navigate to Analytics

1. Click on "Analytics" in the sidebar
2. You should see 5 tabs: Overview, Student Performance, Teacher Performance, Course Analysis, College Comparison

### Step 3: Test Filters

#### Test Location Filters:

1. **State Filter:**
   - Click the "Select State" dropdown
   - Select "Maharashtra"
   - All tabs should now show only data from Maharashtra

2. **City Filter:**
   - After selecting a state, the city dropdown becomes active
   - Select a city (e.g., "Mumbai")
   - Data should filter further to show only that city

3. **College Filter:**
   - Select a specific college from the dropdown
   - Data should show only that college's analytics

4. **Clear Filters:**
   - Click "Clear" to reset all filters
   - All data should be visible again

### Step 4: Test Student Performance Tab

**What to Check:**
- ✅ Table has 12 columns
- ✅ Location shown: "College name" + "City, State"
- ✅ Year displayed (e.g., "Year 1")
- ✅ Courses shown as "Completed/Total" + "X in progress"
- ✅ Progress bar for completion percentage
- ✅ Practice stats: "X sessions / Y questions"
- ✅ Accuracy percentage with correct/total
- ✅ Test performance: "Attempted/Completed" with avg score
- ✅ Time spent in hours + avg session time
- ✅ Last login date + days active

**Test CSV Download:**
1. Click "Download CSV" button
2. File should download as `student-performance-YYYY-MM-DD.csv`
3. Open the CSV and verify it has 23 columns:
   - Student Name, Email, College, State, City, Year, Total Courses, Completed, In Progress, Completion %, Practice Sessions, Questions Attempted, Correct Answers, Accuracy %, Time Spent (hrs), Avg Session (min), Tests Attempted, Tests Completed, Avg Test Score, Highest Score, Lowest Score, Last Login, Days Active

### Step 5: Test Teacher Performance Tab

**What to Check:**
- ✅ Table has 9 columns
- ✅ Location shown: "City, State"
- ✅ Courses: "X active" + "Total: Y"
- ✅ Student count displayed
- ✅ Progress bar for student completion rate
- ✅ Star rating with review count
- ✅ Content activity: "X uploads" + "Y materials"
- ✅ Last active date + time

**Test CSV Download:**
1. Click "Download CSV"
2. Verify it has 13 columns including State, City, Content Uploads

### Step 6: Test Course Analysis Tab

**What to Check:**
- ✅ Table has 9 columns
- ✅ Course title + course code (if available)
- ✅ Location: "City, State"
- ✅ Faculty name + email
- ✅ Content: "X steps" + "Y units"
- ✅ Enrollment: "X enrolled" + "Y completed"
- ✅ Progress bar for completion rate
- ✅ Star rating with review count
- ✅ Status badge (Published/Draft)

**Test CSV Download:**
1. Click "Download CSV"
2. Verify location fields are included

### Step 7: Test College Comparison Tab

**What to Check:**
- ✅ Colleges shown as ranked cards
- ✅ Location display: "📍 City, State"
- ✅ Rank badges (top 3 get trophy icons)
- ✅ College code badge
- ✅ Student/Faculty/Course/Package counts
- ✅ Completion rate percentage
- ✅ Accuracy percentage
- ✅ Engagement score
- ✅ Progress bars for each metric

**Test CSV Download:**
1. Click "Download CSV"
2. Verify all metrics are exported

### Step 8: Verify Real Data

**Student Tab:**
1. Look at practice statistics
2. Numbers should be realistic (not zeros or placeholder data)
3. Should see actual session counts, question counts, accuracy percentages
4. Test scores should have real averages

**Teacher Tab:**
1. Check course counts - should not all be the same
2. Student completion rates should vary by teacher
3. Ratings should be realistic (0-5 stars)
4. Last active dates should be recent

**Course Tab:**
1. Enrollment numbers should vary by course
2. Completion rates should be different
3. Status badges should show "PUBLISHED" or "DRAFT"

**College Tab:**
1. Engagement scores should be different for each college
2. Login counts should be realistic
3. Practice accuracy should vary

### Step 9: Test Filter Combinations

**Combination 1: State + City**
1. Select Maharashtra (state)
2. Select Mumbai (city)
3. Switch between tabs
4. All tabs should show only Mumbai data

**Combination 2: State + College**
1. Select Maharashtra (state)
2. Select a specific college in Maharashtra
3. Data should be further filtered

**Combination 3: Clear and Re-apply**
1. Click "Clear"
2. Select different state
3. Select different city
4. Verify data updates correctly

### Step 10: Visual Verification

**Check for:**
- ✅ No "N/A" or "null" in location fields (should show actual city/state)
- ✅ No "Unknown" colleges (should show real college names)
- ✅ Progress bars render correctly
- ✅ Star icons display for ratings
- ✅ Trophy icons show for top 3 students/colleges
- ✅ Dates formatted correctly (e.g., "12/25/2024")
- ✅ No TypeScript errors in browser console (F12)
- ✅ No API errors in Network tab (F12 → Network)

### Step 11: Performance Check

1. **Load Time:**
   - Each tab should load within 2-3 seconds
   - No infinite loading spinners

2. **Filter Response:**
   - Filters should apply within 1-2 seconds
   - Data should update smoothly

3. **CSV Export:**
   - Download should start immediately
   - File should generate within 1-2 seconds

### Step 12: Edge Cases

**Test with No Data:**
1. Apply filters that have no matching data
2. Should show "No data found" message
3. No errors in console

**Test with Maximum Data:**
1. Remove all filters
2. Should show all available data
3. Tables should scroll properly

**Test Sorting:**
1. Click column headers (if sortable)
2. Data should reorder correctly

---

## 🐛 What to Look For (Potential Issues)

### Data Issues:
- [ ] All zeros in practice stats
- [ ] All zeros in test scores
- [ ] Missing location data (N/A, null)
- [ ] Duplicate student/teacher entries
- [ ] Incorrect calculations (e.g., accuracy > 100%)

### UI Issues:
- [ ] Tables overflow page width
- [ ] Progress bars render incorrectly
- [ ] Icons missing or broken
- [ ] Text overlap in cells
- [ ] Dropdowns not working

### Filter Issues:
- [ ] Filters don't apply to all tabs
- [ ] Clear button doesn't reset
- [ ] City dropdown doesn't update when state changes
- [ ] College dropdown doesn't filter by state

### Export Issues:
- [ ] CSV file won't download
- [ ] Missing columns in CSV
- [ ] Incorrect data in CSV
- [ ] Special characters break CSV format

---

## ✅ Expected Results Summary

After completing all tests, you should confirm:

1. **All 5 tabs load without errors**
2. **Real data displayed (not placeholder zeros)**
3. **Location filters work on all tabs**
4. **Pincode filter is completely removed**
5. **Student table has 12 columns with detailed data**
6. **Teacher table has 9 columns with content metrics**
7. **Course table has 9 columns with location**
8. **College cards show location (city, state)**
9. **CSV exports have 23/13 fields respectively**
10. **No TypeScript or API errors**

---

## 🚨 If You Find Issues

### Browser Console Errors:
1. Press F12 to open DevTools
2. Check Console tab for errors
3. Check Network tab for failed API calls
4. Note the error message and endpoint

### Missing Data:
1. Verify database has data for that entity
2. Check Prisma Studio: `npx prisma studio`
3. Verify the API endpoint in browser DevTools → Network

### UI Rendering Issues:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+F5)
3. Check browser compatibility (Chrome recommended)

---

## 📞 Quick Reference

**Backend Port:** 3001  
**Frontend Port:** 3000  
**Login:** owner@bitflow.com / Password123!  
**Analytics Path:** /analytics  

**API Endpoints:**
- Student: `/api/bitflow-owner/analytics/student-progress?state=&city=`
- Teacher: `/api/bitflow-owner/analytics/teacher-performance?state=&city=`
- Course: `/api/bitflow-owner/analytics/course-performance?state=&city=`
- College: `/api/bitflow-owner/analytics/college-comparison?state=&city=`

---

**Happy Testing! 🎉**
