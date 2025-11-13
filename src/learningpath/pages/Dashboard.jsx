import React, {
  useState, useMemo, useEffect, useRef, useCallback,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Spinner, Container, Col, Button, Pagination, Icon, IconButton, SearchField, Image, Bubble, Alert, Stack,
} from '@openedx/paragon';
import { getConfig } from '@edx/frontend-platform';
import { FilterAlt, FilterList, Search } from '@openedx/paragon/icons';
import { useLearningPaths, useLearnerDashboard, useOrganizations } from '../data/queries';
import LearningPathCard from '../components/cards/LearningPathCard';
import { CourseCard } from '../components/cards/CourseCard';
import FilterPanel from '../components/panels/FilterPanel';
import { useScreenSize } from '../../hooks/useScreenSize';
import noResultsSVG from '../../assets/no_results.svg';

const Dashboard = () => {
  const { isSmall } = useScreenSize();
  const navigate = useNavigate();

  const {
    data: learningPaths,
    isLoading: isLoadingPaths,
    error: pathsError,
  } = useLearningPaths();

  const {
    data: learnerDashboardData,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useLearnerDashboard();

  const {
    data: organizations,
    isLoading: isLoadingOrgs,
  } = useOrganizations();

  const courses = learnerDashboardData?.courses;
  const emailConfirmation = learnerDashboardData?.emailConfirmation;
  const enterpriseDashboard = learnerDashboardData?.enterpriseDashboard;

  const isLoading = isLoadingPaths || isLoadingCourses || isLoadingOrgs;
  const error = pathsError || coursesError;

  if (error) {
    // eslint-disable-next-line no-console
    console.error('Error loading data:', error);
  }

  const items = useMemo(() => {
    // If email confirmation is needed, return empty array to hide all items.
    if (emailConfirmation?.isNeeded) {
      return [];
    }
    return [...(courses || []), ...(learningPaths || [])];
  }, [courses, learningPaths, emailConfirmation]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const mobileSearchRef = useRef(null);

  const handleMobileSearchClick = () => {
    setShowMobileSearch(true);
    // Focus the search field after it becomes visible.
    setTimeout(() => {
      if (mobileSearchRef.current) {
        const inputElement = mobileSearchRef.current.querySelector('input');
        if (inputElement) {
          inputElement.focus();
        }
      }
    }, 0);
  };

  const handleMobileSearchBlur = () => {
    // Hide mobile search when user taps outside and the search query is empty.
    if (isSmall && !searchQuery) {
      setShowMobileSearch(false);
    }
  };

  const showFiltersKey = 'lp_dashboard_showFilters';
  const selectedContentTypeKey = 'lp_dashboard_contentType';
  const selectedStatusesKey = 'lp_dashboard_selectedStatuses';
  const selectedDateStatusesKey = 'lp_dashboard_selectedDateStatuses';
  const selectedOrgsKey = 'lp_dashboard_selectedOrgs';

  const [showFilters, setShowFilters] = useState(() => localStorage.getItem(showFiltersKey) === 'true');
  const [selectedContentType, setSelectedContentType] = useState(() => localStorage.getItem(selectedContentTypeKey) || 'All');
  const [selectedStatuses, setSelectedStatuses] = useState(
    () => JSON.parse(localStorage.getItem(selectedStatusesKey)) || [],
  );
  const [selectedDateStatuses, setSelectedDateStatuses] = useState(
    () => JSON.parse(localStorage.getItem(selectedDateStatusesKey)) || [],
  );
  const [selectedOrgs, setSelectedOrgs] = useState(
    () => JSON.parse(localStorage.getItem(selectedOrgsKey)) || [],
  );

  useEffect(() => { localStorage.setItem(showFiltersKey, showFilters.toString()); }, [showFilters]);
  useEffect(() => {
    localStorage.setItem(selectedContentTypeKey, selectedContentType.toString());
  }, [selectedContentType]);
  useEffect(() => { localStorage.setItem(selectedStatusesKey, JSON.stringify(selectedStatuses)); }, [selectedStatuses]);
  useEffect(() => {
    localStorage.setItem(selectedDateStatusesKey, JSON.stringify(selectedDateStatuses));
  }, [selectedDateStatuses]);
  useEffect(() => { localStorage.setItem(selectedOrgsKey, JSON.stringify(selectedOrgs)); }, [selectedOrgs]);

  const handleStatusChange = (status, isChecked) => {
    setSelectedStatuses(prev => {
      if (isChecked) {
        return [...prev, status];
      }
      return prev.filter(s => s !== status);
    });
  };

  const handleDateStatusChange = (dateStatus, isChecked) => {
    setSelectedDateStatuses(prev => {
      if (isChecked) {
        return [...prev, dateStatus];
      }
      return prev.filter(s => s !== dateStatus);
    });
  };

  const handleOrgChange = (org, isChecked) => {
    setSelectedOrgs(prev => {
      if (isChecked) {
        return [...prev, org];
      }
      return prev.filter(s => s !== org);
    });
  };

  const handleClearFilters = () => {
    setSelectedContentType('All');
    setSelectedStatuses([]);
    setSelectedDateStatuses([]);
    setSelectedOrgs([]);
  };

  // Get only the organizations that are present in the user's items.
  const availableOrganizations = useMemo(() => {
    if (!organizations || !items.length) { return {}; }

    const availableOrgKeys = new Set();
    items.forEach(item => {
      if (item.org) {
        availableOrgKeys.add(item.org);
      }
    });

    const filteredOrgs = {};
    availableOrgKeys.forEach(orgKey => {
      if (organizations[orgKey]) {
        filteredOrgs[orgKey] = organizations[orgKey];
      }
    });

    return filteredOrgs;
  }, [organizations, items]);

  const activeFiltersCount = useMemo(
    () => (selectedContentType !== 'All') + selectedStatuses.length + selectedDateStatuses.length + selectedOrgs.length,
    [selectedContentType, selectedStatuses, selectedDateStatuses, selectedOrgs],
  );

  const getItemDates = (item) => {
    if (item.type === 'course') {
      return {
        startDate: item.startDate ? new Date(item.startDate) : null,
        endDate: item.endDate ? new Date(item.endDate) : null,
      };
    }
    if (item.type === 'learning_path') {
      return {
        startDate: item.minDate ? new Date(item.minDate) : null,
        endDate: item.maxDate ? new Date(item.maxDate) : null,
      };
    }
    return { startDate: null, endDate: null };
  };

  const getDateStatus = useCallback((item) => {
    const currentDate = new Date();
    const { startDate, endDate } = getItemDates(item);

    if (startDate && startDate > currentDate) {
      return 'Upcoming';
    }
    if (endDate && endDate < currentDate) {
      return 'Ended';
    }
    return 'Open';
  }, []);

  const filteredItems = useMemo(() => items.filter(item => {
    const typeMatch = selectedContentType === 'All'
      || (selectedContentType === 'course' && item.type === 'course')
      || (selectedContentType === 'learning_path' && item.type === 'learning_path');
    const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(item.status);
    const dateStatusMatch = selectedDateStatuses.length === 0 || selectedDateStatuses.includes(getDateStatus(item));
    const orgMatch = selectedOrgs.length === 0 || selectedOrgs.includes(item.org);
    const searchMatch = searchQuery === ''
      || (item.displayName && item.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
      || (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return typeMatch && statusMatch && dateStatusMatch && orgMatch && searchMatch;
  }), [items, selectedContentType, selectedStatuses, selectedDateStatuses, selectedOrgs, searchQuery, getDateStatus]);

  const sortedItems = useMemo(() => {
    const statusOrder = { 'not started': 1, 'in progress': 2, completed: 3 };
    const dateStatusOrder = { Upcoming: 1, Open: 2, Ended: 3 };

    return [...filteredItems].sort((a, b) => {
      // 1. Sort by start date category.
      const dateStatusA = dateStatusOrder[getDateStatus(a)] || 999;
      const dateStatusB = dateStatusOrder[getDateStatus(b)] || 999;

      if (dateStatusA !== dateStatusB) {
        return dateStatusA - dateStatusB;
      }

      // 2. Sort by progress status.
      const statusA = statusOrder[a.status?.toLowerCase()] || 999;
      const statusB = statusOrder[b.status?.toLowerCase()] || 999;

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      // 3. Sort alphabetically by name.
      const nameA = (a.displayName || a.name || '').toLowerCase();
      const nameB = (b.displayName || b.name || '').toLowerCase();

      return nameA.localeCompare(nameB);
    });
  }, [filteredItems, getDateStatus]);

  const PAGE_SIZE = getConfig().DASHBOARD_PAGE_SIZE || 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(sortedItems.length / PAGE_SIZE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedItems.slice(start, start + PAGE_SIZE);
  }, [sortedItems, currentPage, PAGE_SIZE]);

  const showingCount = Math.min(PAGE_SIZE, sortedItems.length - (currentPage - 1) * PAGE_SIZE);
  const totalCount = sortedItems.length;

  useEffect(() => {
    // Add a timeout to ensure DOM updates are complete.
    const id = setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 10);
    return () => clearTimeout(id);
  }, [currentPage]);
  // Reset pagination when using filters or search.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedContentType, selectedStatuses, selectedDateStatuses, selectedOrgs]);

  return (
    <>
      {emailConfirmation?.isNeeded && (
        <Alert className="account-activation m-0 p-2 rounded-0 text-center">
          Activate your account! Check your inbox for an account activation link from {getConfig().SITE_NAME}.
          If you need help, <Link to={`${getConfig().LMS_BASE_URL}/contact`} target="_blank" rel="noopener noreferrer">contact us</Link>.
        </Alert>
      )}
      {!emailConfirmation?.isNeeded && enterpriseDashboard?.isLearnerPortalEnabled && (
        <Alert className="enterprise-dashboard m-0 p-2 rounded-0 text-center">
          You have access to the <b>{enterpriseDashboard.label}</b> dashboard. To access the courses available to you through {enterpriseDashboard.label}, visit the{' '}
          <Link to={`${enterpriseDashboard.url}?utm_source=lms_dashboard_banner`}>
            {enterpriseDashboard.label} dashboard
          </Link>.
        </Alert>
      )}
      <div className="dashboard-page-container">
        {/* Filter Sidebar */}
        <aside className={`filter-sidebar-container ${showFilters ? 'open' : 'closed'}`}>
          <FilterPanel
            selectedContentType={selectedContentType}
            onSelectContentType={setSelectedContentType}
            selectedStatuses={selectedStatuses}
            onChangeStatus={handleStatusChange}
            selectedDateStatuses={selectedDateStatuses}
            onChangeDateStatus={handleDateStatusChange}
            selectedOrgs={selectedOrgs}
            onChangeOrg={handleOrgChange}
            organizations={availableOrganizations}
            onClose={() => setShowFilters(false)}
            isSmall={isSmall}
            onClearAll={handleClearFilters}
          />
        </aside>

        {/* Main Content */}
        <main className={`dashboard-main-content ${showFilters ? 'sidebar-open' : 'sidebar-closed'}`}>
          <Container size="xl" className="dashboard py-4">
            {isLoading ? (
              <Stack direction="vertical" className="justify-content-center align-items-center vh-100">
                <Spinner animation="border" variant="primary" />
              </Stack>
            ) : (
              <div className={`${showFilters && isSmall ? 'd-none' : ''}`}>
                {/* Filter Toggle Button - Pushes content */}
                {!isSmall && (
                  <div className="filter-toggle-wrapper mb-3">
                    <IconButton
                      src={FilterList}
                      iconAs={Icon}
                      alt="Toggle filters"
                      onClick={() => setShowFilters(!showFilters)}
                      className="filter-toggle-btn"
                      variant="primary"
                    />
                  </div>
                )}
                <Stack direction="horizontal" gap={3} className="dashboard-header justify-content-between align-items-center mb-4">
                  <h2 className="mb-0">My Learning</h2>
                  {!isSmall ? (
                    <Stack direction="horizontal" gap={2} className="align-items-center flex-shrink-0">
                      <div className="dashboard-search-wrapper">
                        <SearchField
                          onClear={() => setSearchQuery('')}
                          onChange={setSearchQuery}
                          onSubmit={() => {}}
                          value={searchQuery}
                          placeholder="Search courses and paths"
                          screenReaderText="Search"
                        />
                      </div>
                      <Button variant="brand" onClick={() => navigate('/explore')}>
                        Explore
                      </Button>
                    </Stack>
                  ) : (
                    <Stack direction="horizontal" gap={2} className="align-items-center flex-shrink-0">
                      <Button variant="brand" size="sm" onClick={() => navigate('/explore')}>
                        Explore
                      </Button>
                      <IconButton
                        src={Search}
                        iconAs={Icon}
                        variant="black"
                        alt="Search"
                        onClick={handleMobileSearchClick}
                        aria-label="Open search"
                      />
                      <div className="position-relative">
                        <IconButton
                          src={FilterList}
                          iconAs={Icon}
                          variant="black"
                          alt="Filter"
                          onClick={() => setShowFilters(true)}
                          aria-label="Open filters"
                        />
                        {activeFiltersCount > 0 && (
                        <Bubble className="position-absolute" style={{ top: '-0.5rem', right: '-0.5rem' }}>{activeFiltersCount}</Bubble>
                        )}
                      </div>
                    </Stack>
                  )}
                </Stack>
                {isSmall && showMobileSearch && (
                <div className="mobile-search-wrapper mb-3" ref={mobileSearchRef}>
                  <SearchField
                    onClear={() => setSearchQuery('')}
                    onChange={setSearchQuery}
                    onSubmit={() => {}}
                    onBlur={handleMobileSearchBlur}
                    value={searchQuery}
                    placeholder="Search courses and paths"
                    screenReaderText="Search"
                  />
                </div>
                )}
                <Stack direction="horizontal" gap={3} className="justify-content-between align-items-center mb-3">
                  {isSmall && (
                  <Button onClick={() => setShowFilters(true)} variant="secondary" className="filter-button border-0">
                    <Icon src={FilterAlt} /> Filter
                  </Button>
                  )}
                  <div className={`small text-muted ${isSmall ? 'ms-auto' : ''}`}>
                    Showing <b>{showingCount}</b> of <b>{totalCount}</b>
                  </div>
                </Stack>
                <hr className="mt-0 mb-4" />
                {sortedItems.length === 0 ? (
                  <Stack direction="vertical" gap={4} className="align-items-center justify-content-center text-center py-5">
                    <Image src={noResultsSVG} alt="No results" />
                    <Stack direction="vertical" gap={2}>
                      <h3>No matching results</h3>
                      <p className="text-muted mb-0">Try another search or clear your filters</p>
                    </Stack>
                  </Stack>
                ) : (
                  <>
                    {paginatedItems.map(item => (
                      <Col xs={12} lg={11} xl={10} key={item.id || item.key} className={`dashboard-item p-0 mb-4 ${showFilters ? '' : 'mr-auto mx-auto'}`}>
                        {item.type === 'course'
                          ? (
                            <CourseCard
                              course={item}
                              relatedLearningPaths={item.learningPaths}
                              showFilters={showFilters}
                            />
                          )
                          : <LearningPathCard learningPath={item} showFilters={showFilters} />}
                      </Col>
                    ))}
                    <Pagination
                      paginationLabel="learning items navigation"
                      variant={isSmall ? 'reduced' : 'default'}
                      pageCount={totalPages}
                      currentPage={currentPage}
                      onPageSelect={page => setCurrentPage(page)}
                      className="d-flex justify-content-center mt-4"
                    />
                  </>
                )}
              </div>
            )}
          </Container>
        </main>
      </div>
    </>
  );
};

export default Dashboard;
