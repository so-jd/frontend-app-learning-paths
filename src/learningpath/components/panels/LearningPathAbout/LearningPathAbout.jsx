import { useState, useEffect, useMemo } from 'react';
import {
  Container, Card, Button, Badge, Icon, Spinner, IconButton, Alert,
} from '@openedx/paragon';
import { Close, FormatListBulleted, CalendarMonth, Award, CheckCircle, School } from '@openedx/paragon/icons';
import {
  useLearningPathDetail,
  useEnrollLearningPath,
  useCoursesByIds,
} from '../../../data/queries';
import { getConfig } from '@edx/frontend-platform';
import CourseAbout from '../CourseAbout';
import './LearningPathAbout.css';

const LearningPathAbout = ({ learningPathKey, isOpen, onClose }) => {
  const { data: learningPath, isLoading } = useLearningPathDetail(learningPathKey);
  const enrollMutation = useEnrollLearningPath();
  const [enrollmentMessage, setEnrollmentMessage] = useState(null);
  const [selectedCourseKey, setSelectedCourseKey] = useState(null);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  // Extract course keys from steps
  const courseKeys = useMemo(() => {
    if (!learningPath?.steps) return [];
    return learningPath.steps.map(step => step.courseKey);
  }, [learningPath]);

  // Fetch course details for all courses in the path
  const { data: coursesData } = useCoursesByIds(courseKeys);

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
    if (learningPath?.enrollmentDate) {
      return; // Already enrolled
    }

    // Clear any previous error messages
    setEnrollmentMessage(null);

    try {
      const result = await enrollMutation.mutateAsync(learningPathKey);

      if (!result.success) {
        setEnrollmentMessage({
          type: 'danger',
          text: 'Enrollment failed. Please try again.',
        });
      }
      // Success case: no banner, enrollment status will update automatically
    } catch (error) {
      setEnrollmentMessage({
        type: 'danger',
        text: 'An error occurred during enrollment. Please try again.',
      });
    }
  };

  const handleCourseClick = (courseKey) => {
    setSelectedCourseKey(courseKey);
    setIsCourseModalOpen(true);
  };

  const handleCloseCourseModal = () => {
    setIsCourseModalOpen(false);
    setSelectedCourseKey(null);
  };

  const isEnrolled = !!learningPath?.enrollmentDate;
  const isEnrolling = enrollMutation.isPending;

  const imageUrl = learningPath?.image?.startsWith('http')
    ? learningPath.image
    : `${getConfig().LMS_BASE_URL}${learningPath?.image}`;

  // Don't render anything if no learningPathKey has been selected yet
  if (!learningPathKey) {
    return null;
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={`learning-path-about-overlay ${isOpen ? 'visible' : ''}`}
        onClick={handleClose}
      />

      {/* Side panel */}
      <div className={`learning-path-about-panel ${isOpen ? 'open' : ''}`}>
        {isLoading && (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <Spinner animation="border" variant="primary" />
          </div>
        )}

        {!isLoading && !learningPath && (
          <Container className="py-5">
            <div className="text-center">
              <h3>Learning Path not found</h3>
              <Button variant="primary" onClick={handleClose}>
                Back to Explore
              </Button>
            </div>
          </Container>
        )}

        {!isLoading && learningPath && (
          <div className="learning-path-about-page">
            <Container className="py-4">
              {/* Header with back button */}
              <div className="d-flex justify-content-end align-items-center mb-3">
                <IconButton
                  src={Close}
                  iconAs={Icon}
                  alt="Close"
                  onClick={handleClose}
                  variant="light"
                  className="panel-close-button"
                />
              </div>

              {/* Learning Path Card */}
              <Card className="learning-path-about-card mb-4">
                <Card.Body className="p-4">
                  <div className="row">
                    <div className="col-md-7">
                      <Badge variant="light" className="text-uppercase mb-3">
                        LEARNING PATH
                      </Badge>

                      <h2 className="learning-path-title mb-3">{learningPath.displayName}</h2>

                      {learningPath.subtitle && (
                        <p className="learning-path-subtitle text-muted">
                          {learningPath.subtitle}
                        </p>
                      )}

                      {/* Learning Path Meta Info */}
                      <div className="learning-path-meta d-flex mb-4">
                        <div className="meta-item">
                          <Icon src={FormatListBulleted} />
                          <div>
                            <small>Courses</small>
                            <strong>{learningPath.steps?.length || 0}</strong>
                          </div>
                        </div>

                        {learningPath.timeCommitment && (
                          <div className="meta-item">
                            <Icon src={CalendarMonth} />
                            <div>
                              <small>Time</small>
                              <strong>{learningPath.timeCommitment}</strong>
                            </div>
                          </div>
                        )}

                        <div className="meta-item">
                          <Icon src={Award} />
                          <div>
                            <small>Certificate</small>
                            <strong>Available</strong>
                          </div>
                        </div>
                      </div>

                      {enrollmentMessage && (
                        <Alert variant={enrollmentMessage.type} dismissible onClose={() => setEnrollmentMessage(null)} className="mb-3">
                          {enrollmentMessage.text}
                        </Alert>
                      )}

                      {isEnrolled ? (
                        <div className="enrolled-status-container">
                          <div className="enrolled-badge mb-3">
                            <Icon src={CheckCircle} className="me-2" style={{ width: '18px', height: '18px' }} />
                            <span>You're enrolled in this learning path</span>
                          </div>
                          <Button
                            variant="primary"
                            as="a"
                            href={`/learningpath/${learningPathKey}`}
                            className="enroll-button"
                          >
                            View Learning Path
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={handleEnroll}
                          disabled={isEnrolling}
                          className="enroll-button"
                        >
                          {isEnrolling ? (
                            <>
                              <Spinner
                                animation="border"
                                size="sm"
                                className="me-2"
                                style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}
                              />
                              Enrolling...
                            </>
                          ) : (
                            'Enroll now'
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="col-md-5">
                      <div className="learning-path-image-container">
                        <img
                          src={imageUrl}
                          alt={learningPath.displayName}
                          className="learning-path-image"
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
              {learningPath.description && (
                <section className="content-section mb-4">
                  <h3 className="section-title">About</h3>
                  <div
                    className="section-content"
                    dangerouslySetInnerHTML={{ __html: learningPath.description }}
                  />
                </section>
              )}

              {/* Courses Section */}
              {learningPath.steps && learningPath.steps.length > 0 && (
                <section className="content-section mb-4">
                  <h3 className="section-title">Courses in this Path</h3>
                  <div className="section-content">
                    <div className="courses-list">
                      {learningPath.steps.map((step, index) => {
                        const courseData = coursesData?.find(c => c.courseKey === step.courseKey);
                        return (
                          <div
                            key={step.courseKey}
                            className="course-item"
                            onClick={() => handleCourseClick(step.courseKey)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                handleCourseClick(step.courseKey);
                              }
                            }}
                          >
                            <div className="course-number">
                              <span>{index + 1}</span>
                            </div>
                            <div className="course-info">
                              <h5 className="course-name">{courseData?.displayName || courseData?.name || step.courseKey}</h5>
                              {courseData?.org && (
                                <p className="course-org text-muted mb-0">{courseData.org}</p>
                              )}
                            </div>
                            <div className="course-arrow">
                              <Icon src={School} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* Required Skills Section */}
              {learningPath.requiredSkills && learningPath.requiredSkills.length > 0 && (
                <section className="content-section mb-4">
                  <h3 className="section-title">Prerequisites & Required Skills</h3>
                  <div className="section-content">
                    <ul className="skills-list">
                      {learningPath.requiredSkills.map((skill, index) => (
                        <li key={index} className="skill-item">
                          <Icon src={CheckCircle} className="skill-icon" />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}
            </Container>
          </div>
        )}
      </div>

      {/* Course Detail Modal */}
      {selectedCourseKey && (
        <CourseAbout
          courseKey={selectedCourseKey}
          isOpen={isCourseModalOpen}
          onClose={handleCloseCourseModal}
        />
      )}
    </>
  );
};

export default LearningPathAbout;
