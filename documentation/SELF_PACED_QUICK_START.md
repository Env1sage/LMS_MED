# Quick Start: Self-Paced Learning Feature 📚

## Overview
The Self-Paced Learning feature allows faculty to upload supplementary materials (notes, videos, documents) that students can access anytime. This content is **non-mandatory** and **non-graded**, providing flexible learning opportunities.

---

## For Faculty 👨‍🏫

### Accessing Self-Paced Content
1. Login to faculty portal
2. Click on the **"📚 Self-Paced Content"** tab in the dashboard
3. You'll see your uploaded resources

### Creating a New Resource

**Step 1: Click "Create Resource"**

**Step 2: Fill in Details**
- **Title** (required): e.g., "Anatomy Quick Reference Guide"
- **Description** (optional): Brief description of the content
- **Resource Type** (required):
  - 📖 **NOTE**: Text-based notes or study materials
  - 🎬 **VIDEO**: Video lectures or tutorials
  - 📄 **DOCUMENT**: PDFs, slides, handouts
  - 📚 **REFERENCE**: External links or citation materials
  - 🎯 **PRACTICE**: Additional practice exercises

**Step 3: Add Content**
Choose ONE of these options:
- **Upload a file** (PDF, MP4, DOC, DOCX - max 50MB)
- **Write text content** (for notes and references)

**Step 4: Optional Details**
- **Subject**: e.g., "Anatomy", "Physiology"
- **Academic Year**: YEAR_1, YEAR_2, etc.
- **Tags**: Add keywords for easy discovery (e.g., "heart", "cardiovascular", "exam-prep")

**Step 5: Save**
- Click "Create Resource"
- Resource is immediately available to all students in your college

### Managing Resources

**View Your Resources**
- All your uploaded resources appear in a grid
- Each card shows:
  - Resource type badge
  - Title and description
  - Subject and academic year
  - Number of views
  - Tags
  - Creation date

**Edit a Resource**
- Click the ✏️ (edit) icon on a resource card
- Update details and save

**Archive a Resource**
- Click the 🗑️ (archive) icon
- Confirm deletion
- Resource will no longer be visible to students

**View Analytics**
- View count shows on each resource card
- Click a resource to see detailed engagement metrics
- See which students have accessed the content

---

## For Students 📖

### Accessing Self-Paced Learning
1. Login to student portal
2. Click on the **"📚 Self-Paced Learning"** tab
3. Browse available resources from your college faculty

### Finding Resources

**Search**
- Use the search box at the top to find by title, description, or tags
- Example: Search "cardiovascular" to find heart-related materials

**Filter Options**
- **All Subjects**: Filter by specific subject (Anatomy, Physiology, etc.)
- **All Types**: Filter by resource type (Notes, Videos, Documents, etc.)
- **All Years**: Filter by academic year
- **Clear Filters**: Reset all filters to see everything

### Viewing Resources

**Click on any resource card to open it**

**For PDFs:**
- Opens in a built-in viewer
- Read directly in the browser

**For Videos:**
- Plays in an HTML5 video player
- Use controls to play/pause, seek, adjust volume

**For Text Content:**
- Displays formatted text
- Easy to read and scroll

**For Documents:**
- Option to download the file
- Opens in your preferred application

**Tracking:**
- Your view is automatically logged (helps faculty see engagement)
- Time spent viewing is tracked for analytics
- No grades or scores - completely pressure-free!

---

## Common Workflows

### Faculty: Upload a Lecture Recording
1. Go to "Self-Paced Content"
2. Click "+ Create Resource"
3. Title: "Cardiovascular System Lecture - Jan 2025"
4. Type: VIDEO
5. Upload your MP4 file
6. Subject: "Anatomy"
7. Academic Year: "YEAR_1"
8. Tags: "heart", "lecture", "cardiovascular"
9. Save
10. **Result**: All Year 1 students can now watch the lecture anytime

### Faculty: Share Study Notes
1. Go to "Self-Paced Content"
2. Click "+ Create Resource"
3. Title: "Exam Preparation Notes - Respiratory System"
4. Type: NOTE
5. Write content in the text area or upload a PDF
6. Subject: "Physiology"
7. Tags: "exam", "respiratory", "study-guide"
8. Save
9. **Result**: Students can access notes for exam preparation

### Student: Prepare for Exams
1. Go to "Self-Paced Learning"
2. Filter by your current year (e.g., YEAR_2)
3. Search for "exam"
4. Browse available study materials
5. Click on resources to review content
6. Download PDFs for offline study
7. Watch video lectures to reinforce understanding

### Student: Review a Difficult Topic
1. Go to "Self-Paced Learning"
2. Filter by subject (e.g., "Anatomy")
3. Search for the specific topic (e.g., "nervous system")
4. Open relevant resources
5. Spend time reviewing
6. Come back anytime - content is always available!

---

## Tips & Best Practices

### For Faculty
✅ **Use descriptive titles**: "Heart Anatomy - Detailed Notes" is better than "Notes 1"
✅ **Add relevant tags**: Helps students find content easily
✅ **Specify academic year**: Students can filter by their year
✅ **Keep files under 50MB**: For faster uploads and downloads
✅ **Organize by subject**: Use the subject field consistently
✅ **Check analytics**: See which resources are most popular and adjust accordingly
✅ **Update regularly**: Keep content current and relevant

### For Students
✅ **Use filters**: Narrow down to relevant content quickly
✅ **Bookmark important resources**: (Feature coming soon!)
✅ **Utilize search**: Keywords help find exactly what you need
✅ **Review regularly**: Not mandatory, but helpful for understanding
✅ **Download for offline**: PDFs can be saved for offline study
✅ **Watch videos multiple times**: No limit on views

---

## Supported File Types

| Type | Extensions | Max Size | Notes |
|------|------------|----------|-------|
| PDF | .pdf | 50MB | Best for documents, notes, slides |
| Video | .mp4 | 50MB | Recommended for lectures, tutorials |
| Word | .doc, .docx | 50MB | Can be downloaded by students |

---

## Frequently Asked Questions

**Q: Are self-paced resources mandatory?**
A: No! They're supplementary materials to help with learning. No grades or completion tracking.

**Q: Can students see resources from other colleges?**
A: No, students only see resources uploaded by faculty in their own college.

**Q: How long are resources available?**
A: Resources remain available unless the faculty member archives them.

**Q: Can students download the files?**
A: Yes! PDFs and documents can be downloaded for offline access.

**Q: Is there a limit to how many resources I can upload?**
A: No limit on quantity, but each file must be under 50MB.

**Q: Can I edit a resource after publishing?**
A: Yes! Faculty can edit title, description, tags, and replace files anytime.

**Q: Do students get notifications about new resources?**
A: Not currently, but this feature can be added in the future.

**Q: Can I see which specific students viewed my resource?**
A: You can see view counts and aggregate analytics, but individual student tracking is privacy-protected.

---

## Technical Notes

### File Storage
- Uploaded files are stored in: `backend/uploads/self-paced/`
- Files are served securely through the API
- Only authenticated users from the same college can access files

### Security
- JWT authentication required
- Role-based access control
- College-scoped data (students can't see other colleges' resources)
- Faculty can only edit/delete their own resources

### Performance
- Lazy loading for large resource lists
- Efficient database queries
- Cached file serving
- Responsive design for mobile access

---

## Support & Feedback

For issues or suggestions:
1. Check this guide first
2. Contact your system administrator
3. Report bugs to the development team
4. Request new features through proper channels

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: ✅ Production Ready
