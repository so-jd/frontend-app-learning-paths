import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import {
  Card, Button, Row, Col, Icon, Badge, ProgressBar,
} from '@openedx/paragon';
import {
  LmsBook,
  AccessTime,
  CheckCircle,
  LmsCompletionSolid,
  Timelapse,
} from '@openedx/paragon/icons';
import { buildAssetUrl } from '../util/assetUrl';
import { usePrefetchCourseDetail, useCourseEnrollmentStatus, useEnrollCourse } from './data/queries';
import { buildCourseHomeUrl } from './utils';

export const CourseCard = ({ course, parentPath, onClick }) => {
  const courseKey = course.id;
  const {
    name,
    org,
    courseImageAssetPath,
    endDate,
    status,
    percent,
    isEnrolledInCourse,
    checkingEnrollment,
  } = course;

  // Prefetch the course detail when the user hovers over the card.
  const prefetchCourseDetail = usePrefetchCourseDetail(courseKey);
  const handleMouseEnter = () => {
    prefetchCourseDetail();
  };

  const progressBarPercent = useMemo(() => Math.round(percent * 100), [percent]);

  const linkTo = parentPath
    ? `${parentPath}/course/${encodeURIComponent(courseKey)}`
    : `/course/${encodeURIComponent(courseKey)}`;

  const handleViewClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(courseKey);
    }
  };

  let statusVariant = 'dark'; // default
  let statusIcon = 'fa-circle'; // default icon
  switch (status?.toLowerCase()) {
    case 'completed':
      statusVariant = 'success';
      statusIcon = CheckCircle;
      break;
    case 'not started':
      statusVariant = 'secondary';
      statusIcon = LmsCompletionSolid;
      break;
    case 'in progress':
      statusVariant = 'info';
      statusIcon = Timelapse;
      break;
    default:
      statusVariant = 'dark';
      statusIcon = 'fa-circle';
      break;
  }
  const endDateFormatted = endDate
    ? new Date(endDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : null;

  let buttonText = 'View';
  let buttonVariant = 'outline-primary';

  // Update the button based on enrollment status (if available).
  if (isEnrolledInCourse === false) {
    buttonText = 'Start';
    buttonVariant = 'primary';
  } else if (isEnrolledInCourse === true) {
    buttonText = 'Resume';
    buttonVariant = 'outline-success';
  }

  if (checkingEnrollment) {
    buttonText = 'Loading...';
  }

  return (
    <Card className="course-card p-3" onMouseEnter={handleMouseEnter}>
      <div className="lp-status-badge">
        <Badge variant={statusVariant} className="d-flex align-items-center">
          <Icon src={statusIcon} className="mr-1" />
          {status}
        </Badge>
      </div>
      <Row>
        <Col xs={12} md={4} className="course-card-image-col">
          {courseImageAssetPath && (
          <Card.ImageCap
            src={buildAssetUrl(courseImageAssetPath)}
            alt={name}
            style={{ maxHeight: '150px', objectFit: 'cover' }}
          />
          )}
        </Col>
        <Col xs={12} md={8}>
          <div className="course-type-label text-uppercase mb-2">
            <Icon src={LmsBook} className="mr-1" />
            <span>Course</span>
          </div>
          <Card.Header className="p-0 mb-2" title={name} />
          {org && <p className="card-subtitle text-muted mb-2">{org}</p>}
          {status.toLowerCase() === 'in progress' && (
            <ProgressBar.Annotated
              now={progressBarPercent}
              label={`${progressBarPercent}%`}
              variant="dark"
              className="mb-2"
            />
          )}
          <Card.Footer className="p-0 d-flex align-items-center">
            <div className="d-flex flex-wrap mr-auto mb-2">
              {endDateFormatted && (
                <div className="mr-3 d-flex align-items-center">
                  <Icon src={AccessTime} className="mr-1" />
                  Access until {endDateFormatted}
                </div>
              )}
            </div>
            {onClick ? (
              <Button variant={buttonVariant} onClick={handleViewClick} disabled={checkingEnrollment}>
                {buttonText}
              </Button>
            ) : (
              <Link to={linkTo}>
                <Button variant="outline-primary">View</Button>
              </Link>
            )}
          </Card.Footer>
        </Col>
      </Row>
    </Card>
  );
};

CourseCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    org: PropTypes.string.isRequired,
    courseImageAssetPath: PropTypes.string,
    endDate: PropTypes.string,
    status: PropTypes.string.isRequired,
    percent: PropTypes.number.isRequired,
    isEnrolledInCourse: PropTypes.bool,
    checkingEnrollment: PropTypes.bool,
  }).isRequired,
  parentPath: PropTypes.string,
  onClick: PropTypes.func,
};

export const CourseCardWithEnrollment = ({ course, learningPathId }) => {
  const { data: enrollmentStatus, isLoading: checkingEnrollment } = useCourseEnrollmentStatus(course.id);
  const [enrolling, setEnrolling] = useState(false);
  const enrollCourseMutation = useEnrollCourse(learningPathId);

  const courseWithEnrollment = {
    ...course,
    isEnrolledInCourse: enrollmentStatus?.isEnrolled || false,
    checkingEnrollment: checkingEnrollment || enrolling,
  };

  // Defined here because calling the MFE config API from an async function can randomly fail.
  const courseHomeUrl = buildCourseHomeUrl(course.id);

  const handleCourseAction = async () => {
    if (courseWithEnrollment.isEnrolledInCourse) {
      window.location.href = courseHomeUrl;
      return;
    }

    setEnrolling(true);
    try {
      const result = await enrollCourseMutation.mutateAsync(course.id);
      if (result.success) {
        window.location.href = courseHomeUrl;
      } else {
        // eslint-disable-next-line no-console
        console.error('Failed to enroll in the course:', result.data?.error || 'Unknown error');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to enroll in the course:', error);
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <CourseCard
      course={courseWithEnrollment}
      onClick={handleCourseAction}
    />
  );
};

CourseCardWithEnrollment.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  learningPathId: PropTypes.string.isRequired,
};
