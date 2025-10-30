import { useState, useEffect } from 'react';
import {
  Container, Card, Button, Badge, Icon, Spinner, IconButton,
} from '@openedx/paragon';
import { Close, School, CalendarMonth, Speed } from '@openedx/paragon/icons';
import { useCourseDetail } from './data/queries';
import { getConfig } from '@edx/frontend-platform';
import './CourseAbout.css';

const CourseAbout = ({ courseKey, isOpen, onClose }) => {
  const { data: course, isLoading } = useCourseDetail(courseKey);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Add class to body to prevent scroll
      document.body.classList.add('panel-open');
      document.body.style.top = `-${scrollY}px`;

      return () => {
        // Remove class and restore scroll position
        document.body.classList.remove('panel-open');
        document.body.style.top = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const handleEnroll = async () => {
    setIsEnrolling(true);
    // TODO: Implement enrollment logic
    // await enrollInCourse(courseKey);
    setTimeout(() => {
      setIsEnrolling(false);
      // Show success message or redirect
    }, 1000);
  };

  const courseImageUrl = course?.courseImageAssetPath?.startsWith('http')
    ? course.courseImageAssetPath
    : `${getConfig().LMS_BASE_URL}${course?.courseImageAssetPath}`;

  // Don't render anything if no courseKey has been selected yet
  if (!courseKey) {
    return null;
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={`course-about-overlay ${isOpen ? 'visible' : ''}`}
        onClick={handleClose}
      />

      {/* Side panel */}
      <div className={`course-about-panel ${isOpen ? 'open' : ''}`}>
        {isLoading && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <Spinner animation="border" variant="primary" />
          </div>
        )}

        {!isLoading && !course && (
          <Container className="py-5">
            <div className="text-center">
              <h3>Course not found</h3>
              <Button variant="primary" onClick={handleClose}>
                Back to Explore
              </Button>
            </div>
          </Container>
        )}

        {!isLoading && course && (
          <div className="course-about-page">
            <Container className="py-4">
              {/* Header with back button */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <small className="text-muted">Course Details</small>
                  <h4 className="mb-0">{course.org}</h4>
                </div>
                <IconButton
                  src={Close}
                  iconAs={Icon}
                  alt="Close"
                  onClick={handleClose}
                  variant="light"
                  className="panel-close-button"
                />
              </div>

        {/* Course Card */}
        <Card className="course-about-card mb-4">
          <Card.Body className="p-4">
            <div className="row">
              <div className="col-md-7">
                <Badge variant="light" className="text-uppercase mb-3">
                  COURSE
                </Badge>

                <h2 className="course-title mb-3">{course.name}</h2>

                <p className="course-description text-muted">
                  {course.shortDescription || 'Explore this comprehensive course designed to enhance your knowledge and skills.'}
                </p>

                {/* Course Meta Info */}
                <div className="course-meta d-flex gap-4 mb-4">
                  <div className="meta-item">
                    <Icon src={School} className="me-2" />
                    <div>
                      <small className="d-block text-muted">Certificate</small>
                      <strong>Earn a verified certificate</strong>
                    </div>
                  </div>

                  <div className="meta-item">
                    <Icon src={CalendarMonth} className="me-2" />
                    <div>
                      <small className="d-block text-muted">Duration</small>
                      <strong>{course.duration || 'Self-paced'}</strong>
                    </div>
                  </div>

                  <div className="meta-item">
                    <Icon src={Speed} className="me-2" />
                    <div>
                      <small className="d-block text-muted">Pace</small>
                      <strong>{course.selfPaced ? 'Self-paced' : 'Instructor-led'}</strong>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleEnroll}
                  disabled={isEnrolling}
                  className="enroll-button"
                >
                  {isEnrolling ? 'Enrolling...' : 'Enroll now'}
                </Button>
              </div>

              <div className="col-md-5">
                <div className="course-image-container">
                  <img
                    src={courseImageUrl}
                    alt={course.name}
                    className="course-image"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>

        {/* About Section */}
        <section className="content-section mb-4">
          <h3 className="section-title">About</h3>
          <div
            className="section-content"
            dangerouslySetInnerHTML={{ __html: course.description || 'No description available.' }}
          />
        </section>

        {/* What You'll Learn Section */}
        <section className="content-section mb-4">
          <h3 className="section-title">What you'll learn</h3>
          <div className="section-content">
            <ul className="learning-objectives">
              <li>Gain comprehensive knowledge in {course.name}</li>
              <li>Master key concepts and practical applications</li>
              <li>Develop skills through hands-on exercises</li>
              <li>Earn a certificate upon successful completion</li>
            </ul>
          </div>
        </section>

        {/* Qualification Section */}
        <section className="content-section mb-4">
          <h3 className="section-title">Qualification</h3>
          <div className="section-content">
            <p>
              This course is designed for learners at all levels. No prior experience is required,
              though basic familiarity with the subject matter may be helpful.
            </p>
          </div>
        </section>

        {/* Instructors Section */}
        <section className="content-section mb-4">
          <h3 className="section-title">Instructors</h3>
          <div className="instructors-grid">
            <Card className="instructor-card">
              <Card.Body className="text-center p-4">
                <div className="instructor-avatar mx-auto mb-3" />
                <h5 className="instructor-name mb-1">Instructor Name</h5>
                <p className="instructor-title text-muted mb-0">
                  Professor at {course.org}
                </p>
              </Card.Body>
            </Card>
          </div>
              </section>
            </Container>
          </div>
        )}
      </div>
    </>
  );
};

export default CourseAbout;
