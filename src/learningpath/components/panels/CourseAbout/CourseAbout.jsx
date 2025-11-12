import { useState, useEffect, useMemo } from 'react';
import {
  Container, Card, Button, Badge, Icon, Spinner, IconButton, Alert, Skeleton,
} from '@openedx/paragon';
import { Close, School, CalendarMonth, Speed, CheckCircle } from '@openedx/paragon/icons';
import {
  useCourseDetail,
  useCourseEnrollmentStatus,
  useEnrollInSelfPacedCourse,
  useAllObjectTags,
  useCoursePrerequisites,
} from '../../../data/queries';
import { getConfig } from '@edx/frontend-platform';
import './CourseAbout.css';

const CourseAbout = ({ courseKey, isOpen, onClose }) => {
  const { data: course, isLoading } = useCourseDetail(courseKey);
  const { data: enrollmentStatus, isLoading: isLoadingEnrollment } = useCourseEnrollmentStatus(courseKey);
  const { data: allObjectTags } = useAllObjectTags();
  const { data: prerequisites, isLoading: isLoadingPrerequisites } = useCoursePrerequisites(courseKey);
  const enrollMutation = useEnrollInSelfPacedCourse();
  const [enrollmentMessage, setEnrollmentMessage] = useState(null);

  // Extract tags for this specific course from allObjectTags
  const courseTags = useMemo(() => {
    if (!courseKey || !allObjectTags || !allObjectTags[courseKey]) {
      return { results: [], taxonomies: {} };
    }

    const tagData = allObjectTags[courseKey];
    const tags = tagData.tags || [];
    const taxonomies = tagData.taxonomies || {};

    return {
      results: tags,
      taxonomies,
    };
  }, [courseKey, allObjectTags]);

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
    if (enrollmentStatus?.isEnrolled) {
      return; // Already enrolled
    }

    // Clear any previous error messages
    setEnrollmentMessage(null);

    try {
      const result = await enrollMutation.mutateAsync(courseKey);

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

  const isEnrolled = enrollmentStatus?.isEnrolled;
  const isEnrolling = enrollMutation.isPending;

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
                <div className="course-meta d-flex mb-4">
                  <div className="meta-item">
                    <Icon src={School} />
                    <div>
                      <small>Certificate</small>
                      <strong>Verified</strong>
                    </div>
                  </div>

                  <div className="meta-item">
                    <Icon src={CalendarMonth} />
                    <div>
                      <small>Duration</small>
                      <strong>{course.duration || 'Flexible'}</strong>
                    </div>
                  </div>

                  <div className="meta-item">
                    <Icon src={Speed} />
                    <div>
                      <small>Pace</small>
                      <strong>{course.selfPaced ? 'Self-paced' : 'Instructor-led'}</strong>
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
                      <span>You're enrolled in this course</span>
                    </div>
                    <Button
                      variant="primary"
                      as="a"
                      href={`${getConfig().LMS_BASE_URL}/courses/${courseKey}/course/`}
                      className="enroll-button"
                    >
                      View Course
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleEnroll}
                    disabled={isEnrolling || isLoadingEnrollment}
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

        {/* Tags Section */}
        {courseTags?.results && courseTags.results.length > 0 && (
          <section className="content-section mb-4">
            <h3 className="section-title">Topics</h3>
            <div className="section-content">
              <div className="tags-container">
                {courseTags.results.map((tag, index) => {
                  const taxonomyName = courseTags.taxonomies?.[tag.taxonomyId]?.name || 'Tag';
                  return (
                    <Badge
                      key={`${tag.taxonomyId}-${tag.value}-${index}`}
                      variant="secondary"
                      className="course-tag-badge"
                      title={taxonomyName}
                    >
                      {tag.value}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Qualification Section - Only show if prerequisites exist */}
        {(isLoadingPrerequisites || prerequisites?.hasPrerequisites || course.prerequisitesHtml) && (
          <section className="content-section mb-4">
            <h3 className="section-title">Prerequisites & Requirements</h3>
            <div className="section-content">
              {isLoadingPrerequisites ? (
                // Loading shimmer state
                <div className="prerequisites-loading">
                  <div className="prerequisites-summary">
                    <Skeleton height={60} width={60} className="skeleton-circle" />
                    <div style={{ flex: 1 }}>
                      <Skeleton height={24} width="40%" className="mb-2" />
                      <Skeleton height={16} width="80%" />
                    </div>
                  </div>
                  <div className="prerequisites-list-loading mt-4">
                    <Skeleton height={20} width="30%" className="mb-3" />
                    <Skeleton height={70} className="mb-2" />
                    <Skeleton height={70} className="mb-2" />
                    <Skeleton height={70} />
                  </div>
                </div>
              ) : prerequisites?.hasPrerequisites ? (
                <div className="prerequisites-container">
                  {/* Progress Summary */}
                  <div className="prerequisites-summary">
                    <div className="summary-icon">
                      <Icon
                        src={prerequisites.allPrerequisitesMet ? CheckCircle : School}
                        className="summary-icon-img"
                      />
                    </div>
                    <div className="summary-text">
                      <h4 className="summary-title">
                        {prerequisites.allPrerequisitesMet
                          ? 'All Prerequisites Met'
                          : 'Prerequisites Required'}
                      </h4>
                      <p className="summary-description">
                        {prerequisites.allPrerequisitesMet
                          ? 'You have completed all required prerequisite courses and can enroll.'
                          : `Complete ${prerequisites.unfulfilledPrerequisites.length} of ${prerequisites.prerequisites.length} required courses to enroll.`}
                      </p>
                    </div>
                    {!prerequisites.allPrerequisitesMet && (
                      <div className="summary-progress">
                        <div
                          className="progress-circle"
                          style={{
                            '--progress': `${
                              ((prerequisites.prerequisites.length - prerequisites.unfulfilledPrerequisites.length)
                                / prerequisites.prerequisites.length) * 100
                            }`,
                          }}
                        >
                          <span className="progress-text">
                            {prerequisites.prerequisites.length - prerequisites.unfulfilledPrerequisites.length}
                            /
                            {prerequisites.prerequisites.length}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Prerequisites List */}
                  <div className="prerequisites-list-container">
                    <h5 className="prerequisites-list-title">Required Courses</h5>
                    <ul className="prerequisites-list">
                      {prerequisites.prerequisites.map((prereq) => {
                        const isFulfilled = !prerequisites.unfulfilledPrerequisites.some(
                          (unfulfilled) => unfulfilled.courseId === prereq.courseId,
                        );
                        return (
                          <li
                            key={prereq.courseId}
                            className={`prerequisite-item ${isFulfilled ? 'fulfilled' : 'unfulfilled'}`}
                          >
                            <div className="prerequisite-status">
                              <Icon
                                src={CheckCircle}
                                className={`status-icon ${isFulfilled ? 'status-fulfilled' : 'status-unfulfilled'}`}
                              />
                            </div>
                            <div className="prerequisite-content">
                              <span className="prerequisite-name">{prereq.displayName}</span>
                              <span className={`prerequisite-badge ${isFulfilled ? 'badge-fulfilled' : 'badge-unfulfilled'}`}>
                                {isFulfilled ? 'Completed' : 'Required'}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ) : course.prerequisitesHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: course.prerequisitesHtml }}
                />
              ) : null}
            </div>
          </section>
        )}

        {/* Instructors Section - Only show for instructor-led courses */}
        {!course.selfPaced && (
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
        )}
            </Container>
          </div>
        )}
      </div>
    </>
  );
};

export default CourseAbout;
