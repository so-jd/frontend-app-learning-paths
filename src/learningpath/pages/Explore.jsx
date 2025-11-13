import { useState, useMemo, useEffect } from 'react';
import {
  Container, Row, Col, Button, Card, IconButton, SearchField,
  Form, Image, Spinner, Icon, Badge,
} from '@openedx/paragon';
import { Close, FilterList, CheckCircle } from '@openedx/paragon/icons';
import { getConfig } from '@edx/frontend-platform';
import { useNavigate } from 'react-router-dom';
import {
  useCourseDiscoveryWithEnrollments, useLearningPaths, useTaxonomies, useAllObjectTags,
} from '../data/queries';
import { useScreenSize } from '../../hooks/useScreenSize';
import noResultsSVG from '../../assets/no_results.svg';
import CourseAbout from '../components/panels/CourseAbout';
import LearningPathAbout from '../components/panels/LearningPathAbout';
import '../index.css';

const Explore = () => {
  const { isSmall } = useScreenSize();
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [pageSize] = useState(100); // Load more courses
  const [selectedCourseKey, setSelectedCourseKey] = useState(null);
  const [isAboutPanelOpen, setIsAboutPanelOpen] = useState(false);
  const [selectedLearningPathKey, setSelectedLearningPathKey] = useState(null);
  const [isLearningPathPanelOpen, setIsLearningPathPanelOpen] = useState(false);

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

  const { data: taxonomiesData } = useTaxonomies();
  const { data: allObjectTags } = useAllObjectTags();

  const discoveryCourses = useMemo(() => discoveryData?.courses || [], [discoveryData]);
  const isLoading = isLoadingDiscovery || isLoadingPaths;

  // Add status to items based on enrollment and completion, and merge tags
  const itemsWithStatus = useMemo(() => {
    const items = [...discoveryCourses, ...(learningPaths || [])];
    // Debug: Log learning paths data
    if (learningPaths && learningPaths.length > 0) {
      console.log('Learning paths data:', learningPaths);
    }
    return items.map(item => {
      // Determine status
      let status = 'not-enrolled';
      if (item.enrollmentDate) {
        const percent = item.percent || 0;
        if (percent >= 100) {
          status = 'completed';
        } else if (percent > 0) {
          status = 'in-progress';
        } else {
          status = 'enrolled';
        }
      }

      // Merge tags from allObjectTags
      const courseKey = item.courseKey || item.id || item.key;
      const tagData = allObjectTags && allObjectTags[courseKey];
      const tags = tagData?.tags || [];

      return { ...item, status, tags };
    });
  }, [discoveryCourses, learningPaths, allObjectTags]);

  // Collect unique tags from all displayed items
  const displayedTags = useMemo(() => {
    const tagsSet = new Map();

    itemsWithStatus.forEach(item => {
      if (item.tags && item.tags.length > 0) {
        item.tags.forEach(tag => {
          const key = `${tag.taxonomyId}-${tag.value}`;
          if (!tagsSet.has(key)) {
            tagsSet.set(key, {
              id: key,
              value: tag.value,
              taxonomyId: tag.taxonomyId,
              taxonomyName: tag.taxonomyName || `Taxonomy ${tag.taxonomyId}`,
            });
          }
        });
      }
    });

    return Array.from(tagsSet.values());
  }, [itemsWithStatus]);

  // Status options
  const statusOptions = [
    { value: 'not-enrolled', label: 'Not Enrolled' },
    { value: 'enrolled', label: 'Enrolled' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const handleStatusChange = (statusValue, isChecked) => {
    setSelectedStatuses(prev => {
      if (isChecked) {
        return [...prev, statusValue];
      }
      return prev.filter(s => s !== statusValue);
    });
  };

  const handleTagChange = (tagId, isChecked) => {
    setSelectedTags(prev => {
      if (isChecked) {
        return [...prev, tagId];
      }
      return prev.filter(t => t !== tagId);
    });
  };

  // Filter items based on tab, search, status, and tags
  const filteredItems = useMemo(() => itemsWithStatus.filter(item => {
    // Tab filter
    if (selectedTab === 'courses' && item.type !== 'course') { return false; }
    if (selectedTab === 'learning_paths' && item.type !== 'learning_path') { return false; }

    // Tag filter - if any tags are selected, only show items with matching tags
    // Tags from content_tagging have format: {value: "Computer Science", taxonomyId: 1}
    if (selectedTags.length > 0) {
      const itemTags = item.tags || [];
      const itemTagIds = itemTags.map(t => `${t.taxonomyId}-${t.value}`);
      const hasMatchingTag = selectedTags.some(tagId => itemTagIds.includes(tagId));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Status filter - if any statuses are selected, only show items matching those statuses
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(item.status)) {
      return false;
    }

    // Search is handled by the API for discovery courses
    // Only apply local search filter for learning paths when there's no API search
    if (!item.isDiscovery && searchQuery !== '') {
      const tagValues = (item.tags || []).map(t => t.value).join(' ');
      const searchMatch = (item.displayName && item.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
          || (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()))
          || tagValues.toLowerCase().includes(searchQuery.toLowerCase());
      if (!searchMatch) { return false; }
    }

    return true;
  }), [itemsWithStatus, selectedTab, selectedTags, selectedStatuses, searchQuery]);

  const handleCardClick = (item) => {
    const isLearningPath = item.type === 'learning_path';
    if (isLearningPath) {
      // Open learning path about panel - mount first, then trigger animation
      setSelectedLearningPathKey(item.key);
      // Small delay to allow DOM to render before adding open class
      setTimeout(() => {
        setIsLearningPathPanelOpen(true);
      }, 10);
    } else {
      // Open course about panel - mount first, then trigger animation
      setSelectedCourseKey(item.courseKey);
      // Small delay to allow DOM to render before adding open class
      setTimeout(() => {
        setIsAboutPanelOpen(true);
      }, 10);
    }
  };

  const handleCloseCourseAbout = () => {
    setIsAboutPanelOpen(false);
    setTimeout(() => {
      setSelectedCourseKey(null);
    }, 350); // Wait for animation to finish
  };

  const handleCloseLearningPathPanel = () => {
    setIsLearningPathPanelOpen(false);
    setTimeout(() => {
      setSelectedLearningPathKey(null);
    }, 350); // Wait for animation to finish
  };

  const renderCard = (item) => {
    const isLearningPath = item.type === 'learning_path';
    // For learning paths, use item.image; for courses, use item.courseImageUrl
    let imageUrl = isLearningPath ? item.image : item.courseImageUrl;
    const courseName = item.displayName;
    const orgName = isLearningPath ? item.subtitle : item.org;

    // If image URL is relative, prepend LMS base URL
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${getConfig().LMS_BASE_URL}${imageUrl}`;
    }

    return (
      <div
        key={item.id || item.key || item.courseKey}
        className="discover-card-wrapper"
        onClick={() => handleCardClick(item)}
        style={{ cursor: 'pointer' }}
      >
        <Card className={`h-100 discover-card ${isLearningPath ? 'learning-path-card' : 'course-card'}`}>
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
              {imageUrl && (
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
              )}
              {isLearningPath && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'var(--crimson)',
                    color: 'white',
                    padding: '0.4rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    borderRadius: '4px',
                    zIndex: 2,
                    letterSpacing: '0.5px',
                  }}
                >
                  Learning Path
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

            {isLearningPath && item.numCourses !== undefined && (
              <div className="small text-muted mb-2" style={{ fontWeight: '500' }}>
                {item.numCourses} {item.numCourses === 1 ? 'Course' : 'Courses'}
              </div>
            )}

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
              {item.status === 'enrolled' && (
                <Badge
                  variant="success"
                  className="text-uppercase d-flex align-items-center enrolled-badge"
                  style={{ gap: '0.25rem' }}
                >
                  <Icon src={CheckCircle} style={{ width: '14px', height: '14px' }} />
                  ENROLLED
                </Badge>
              )}
              {item.status === 'in-progress' && (
                <Badge
                  variant="info"
                  className="text-uppercase d-flex align-items-center"
                  style={{ gap: '0.25rem' }}
                >
                  <Icon src={CheckCircle} style={{ width: '14px', height: '14px' }} />
                  IN PROGRESS
                </Badge>
              )}
              {item.status === 'completed' && (
                <Badge
                  variant="success"
                  className="text-uppercase d-flex align-items-center"
                  style={{ gap: '0.25rem' }}
                >
                  <Icon src={CheckCircle} style={{ width: '14px', height: '14px' }} />
                  COMPLETED
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
    <>
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

            {/* Status Filter */}
            <div className="filter-section">
              <h5 className="filter-section-title">Status</h5>
              <div className="status-filter-checkboxes">
                {statusOptions.map(status => (
                  <Form.Check
                    key={status.value}
                    type="checkbox"
                    id={`status-${status.value}`}
                    label={status.label}
                    checked={selectedStatuses.includes(status.value)}
                    onChange={(e) => handleStatusChange(status.value, e.target.checked)}
                    className="filter-checkbox"
                  />
                ))}
              </div>
            </div>

            {/* Tag Filter */}
            <div className="filter-section">
              <h5 className="filter-section-title">Tags</h5>
              <div className="status-filter-checkboxes">
                {displayedTags.length > 0 ? (
                  displayedTags.map(tag => (
                    <Form.Check
                      key={tag.id}
                      type="checkbox"
                      id={`tag-${tag.id}`}
                      label={`${tag.value} (${tag.taxonomyName})`}
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e) => handleTagChange(tag.id, e.target.checked)}
                      className="filter-checkbox"
                    />
                  ))
                ) : (
                  <p className="text-muted small">
                    No tags found. Tag courses in Studio to enable filtering.
                  </p>
                )}
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
                    Showing {filteredItems.length} of {itemsWithStatus.length}
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

      {/* Course About Side Panel */}
      <CourseAbout
        courseKey={selectedCourseKey}
        isOpen={isAboutPanelOpen}
        onClose={handleCloseCourseAbout}
      />

      {/* Learning Path About Side Panel */}
      <LearningPathAbout
        learningPathKey={selectedLearningPathKey}
        isOpen={isLearningPathPanelOpen}
        onClose={handleCloseLearningPathPanel}
      />
    </>
  );
};

export default Explore;
