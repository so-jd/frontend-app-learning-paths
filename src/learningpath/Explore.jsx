import { useState, useMemo, useEffect } from 'react';
import {
  Container, Row, Col, Button, Card, IconButton, SearchField,
  Form, Image, Spinner, Icon, Badge,
} from '@openedx/paragon';
import { Close, FilterList, CheckCircle } from '@openedx/paragon/icons';
import { useCourseDiscoveryWithEnrollments, useLearningPaths } from './data/queries';
import { useScreenSize } from '../hooks/useScreenSize';
import noResultsSVG from '../assets/no_results.svg';
import { getConfig } from '@edx/frontend-platform';
import './index.css';

const Explore = () => {
  const { isSmall } = useScreenSize();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedDurations, setSelectedDurations] = useState([]);
  const [pageSize] = useState(100); // Load more courses

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data: discoveryData,
    isLoading: isLoadingDiscovery,
  } = useCourseDiscoveryWithEnrollments({ searchString: debouncedSearchQuery, pageSize, pageIndex: 0 });

  const {
    data: learningPaths,
    isLoading: isLoadingPaths,
  } = useLearningPaths();

  const discoveryCourses = useMemo(() => discoveryData?.courses || [], [discoveryData]);
  const isLoading = isLoadingDiscovery || isLoadingPaths;

  // Combine all items
  const allItems = useMemo(() => [...discoveryCourses, ...(learningPaths || [])], [discoveryCourses, learningPaths]);

  // Subject options - these should be dynamic based on your data
  const subjects = [
    'Artificial Intelligence',
    'Biochemistry',
    'Genetics',
    'Immunology',
    'Pharmacology',
    'Physiology',
  ];

  // Duration options
  const durations = [
    { label: '0 to 1 week', min: 0, max: 1 },
    { label: '1 to 2 weeks', min: 1, max: 2 },
    { label: '2 to 4 weeks', min: 2, max: 4 },
    { label: '4 to 8 weeks', min: 4, max: 8 },
    { label: '8 to 12 weeks', min: 8, max: 12 },
    { label: '12+ weeks', min: 12, max: Infinity },
  ];

  const handleSubjectChange = (subject, isChecked) => {
    setSelectedSubjects(prev => {
      if (isChecked) {
        return [...prev, subject];
      }
      return prev.filter(s => s !== subject);
    });
  };

  const handleDurationChange = (duration, isChecked) => {
    setSelectedDurations(prev => {
      if (isChecked) {
        return [...prev, duration];
      }
      return prev.filter(d => d.label !== duration.label);
    });
  };

  // Filter items based on tab, search, subjects, and durations
  const filteredItems = useMemo(() => allItems.filter(item => {
    // Tab filter
    if (selectedTab === 'courses' && item.type !== 'course') { return false; }
    if (selectedTab === 'learning_paths' && item.type !== 'learning_path') { return false; }

    // Search is handled by the API for discovery courses
    // Only apply local search filter for learning paths when there's no API search
    if (!item.isDiscovery && searchQuery !== '') {
      const searchMatch = (item.displayName && item.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
          || (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!searchMatch) { return false; }
    }

    // Subject filter (if subjects are tagged in your data)
    // For now, this is a placeholder - you'll need to add subject tags to your data
    if (selectedSubjects.length > 0) {
      // Implement subject filtering based on your data structure
      // return selectedSubjects.some(subject => item.subjects?.includes(subject));
    }

    // Duration filter (if duration data is available)
    if (selectedDurations.length > 0) {
      // Implement duration filtering based on your data structure
      // You might need to calculate duration from start/end dates or use a duration field
    }

    return true;
  }), [allItems, selectedTab, searchQuery, selectedSubjects, selectedDurations]);

  const renderCard = (item) => {
    const isLearningPath = item.type === 'learning_path';
    let imageUrl = item.courseImageUrl;
    const courseName = item.displayName;
    const orgName = item.org;

    // If image URL is relative, prepend LMS base URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${getConfig().LMS_BASE_URL}${imageUrl}`;
    }

    return (
      <div key={item.id || item.key || item.courseKey} className="discover-card-wrapper">
        <Card className="h-100 discover-card">
          <Card.Section className="p-0">
            <div
              className="card-image-wrapper"
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                backgroundColor: '#f5f5f5',
                overflow: 'hidden',
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={courseName}
                  style={{
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease',
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span style={{ fontSize: '3rem' }}>📚</span>
                </div>
              )}
            </div>
          </Card.Section>

          <Card.Section className="d-flex flex-column flex-grow-1">
            {orgName && (
              <div className="small text-muted mb-2">
                <strong>{orgName}</strong>
              </div>
            )}

            <Card.Header
              title={courseName}
              className="flex-grow-1"
            />

            {item.shortDescription && (
              <p
                className="small text-muted mb-3"
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {item.shortDescription}
              </p>
            )}

            <div className="d-flex align-items-center mt-auto flex-wrap" style={{ gap: '0.5rem' }}>
              {isLearningPath ? (
                <Badge variant="primary" className="text-uppercase">LEARNING PATH</Badge>
              ) : (
                <Badge variant="light" className="text-uppercase">COURSE</Badge>
              )}
              {item.enrollmentDate && (
                <Badge
                  variant="success"
                  className="text-uppercase d-flex align-items-center enrolled-badge"
                  style={{ gap: '0.25rem' }}
                >
                  <Icon src={CheckCircle} style={{ width: '14px', height: '14px' }} />
                  ENROLLED
                </Badge>
              )}
            </div>
          </Card.Section>
        </Card>
      </div>
    );
  };

  useEffect(() => {
    if (isSmall) {
      setShowFilters(false);
    }
  }, [isSmall]);

  return (
    <div className="explore-page-container">
      {/* Collapsible Filter Sidebar */}
      <aside className={`filter-sidebar-container ${showFilters ? 'open' : 'closed'}`}>
        <div className="filter-sidebar-content">
          <div className="filter-header">
            <h4 className="mb-0">Filters</h4>
            <IconButton
              src={Close}
              iconAs={Icon}
              alt="Close filters"
              onClick={() => setShowFilters(false)}
              size="sm"
            />
          </div>

          {/* Content Type Tabs */}
          <div className="filter-section">
            <h5 className="filter-section-title">Content Type</h5>
            <div className="content-type-grid">
              <Button
                variant={selectedTab === 'all' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedTab('all')}
                className="filter-grid-btn"
              >
                All
              </Button>
              <Button
                variant={selectedTab === 'courses' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedTab('courses')}
                className="filter-grid-btn"
              >
                Courses
              </Button>
              <Button
                variant={selectedTab === 'learning_paths' ? 'primary' : 'outline-primary'}
                onClick={() => setSelectedTab('learning_paths')}
                className="filter-grid-btn"
              >
                Learning Paths
              </Button>
            </div>
          </div>

          {/* Subject Filter */}
          <div className="filter-section">
            <h5 className="filter-section-title">Subject</h5>
            <div className="checkbox-grid">
              {subjects.map(subject => (
                <Form.Check
                  key={subject}
                  type="checkbox"
                  id={`subject-${subject}`}
                  label={subject}
                  checked={selectedSubjects.includes(subject)}
                  onChange={(e) => handleSubjectChange(subject, e.target.checked)}
                  className="filter-checkbox"
                />
              ))}
            </div>
          </div>

          {/* Duration Filter */}
          <div className="filter-section">
            <h5 className="filter-section-title">Duration</h5>
            <div className="checkbox-grid">
              {durations.map(duration => (
                <Form.Check
                  key={duration.label}
                  type="checkbox"
                  id={`duration-${duration.label}`}
                  label={duration.label}
                  checked={selectedDurations.some(d => d.label === duration.label)}
                  onChange={(e) => handleDurationChange(duration, e.target.checked)}
                  className="filter-checkbox"
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Filter Toggle Button - Fixed position */}
      <IconButton
        src={FilterList}
        iconAs={Icon}
        alt="Toggle filters"
        onClick={() => setShowFilters(!showFilters)}
        className="filter-toggle-icon-btn"
        variant="primary"
      />

      {/* Main Content */}
      <main className={`explore-main-content ${showFilters ? 'sidebar-open' : 'sidebar-closed'}`}>
        <Container fluid className="px-3 px-md-4 py-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
            <div className="d-flex align-items-center gap-3">
              <div>
                <h1 className="mb-1">Explore</h1>
                <div className="text-muted">
                  Showing {filteredItems.length} of {allItems.length}
                </div>
              </div>
            </div>
            <SearchField
              onClear={() => setSearchQuery('')}
              onChange={setSearchQuery}
              onSubmit={() => {}}
              value={searchQuery}
              placeholder="Search"
              className="w-100 w-md-50"
              style={{ maxWidth: isSmall ? '100%' : '400px' }}
            />
          </div>

          {(() => {
            if (isLoading) {
              return (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                  <Spinner animation="border" variant="primary" />
                </div>
              );
            }
            if (filteredItems.length === 0) {
              return (
                <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
                  <Image src={noResultsSVG} alt="No results" className="mb-4" style={{ maxWidth: '300px' }} />
                  <div>
                    <h3 className="my-2">No matching results</h3>
                    <p className="text-muted">Try another search or adjust your filters</p>
                  </div>
                </div>
              );
            }
            return (
              <div className="courses-grid">
                {filteredItems.map(item => renderCard(item))}
              </div>
            );
          })()}
        </Container>
      </main>
    </div>
  );
};

export default Explore;
