import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, ButtonGroup, Form, Icon, IconButton,
} from '@openedx/paragon';
import { Close } from '@openedx/paragon/icons';

const FilterPanel = ({
  selectedContentType,
  onSelectContentType,
  selectedStatuses,
  onChangeStatus,
  selectedDateStatuses,
  onChangeDateStatus,
  selectedOrgs,
  onChangeOrg,
  organizations,
  onClose,
  isSmall,
  onClearAll,
}) => (
  <div className="filter-sidebar-content">
    <div className="filter-header">
      <h4 className="mb-0">Filters</h4>
      {!isSmall && (
        <Button variant="link" onClick={onClearAll} className="filter-clear-link">Clear all</Button>
      )}
      {isSmall && (
        <IconButton
          src={Close}
          iconAs={Icon}
          onClick={onClose}
          alt="Close filters"
          size="sm"
        />
      )}
    </div>

    {/* Content Type Section */}
    <div className="filter-section">
      <h5 className="filter-section-title">Content Type</h5>
      <div className="content-type-grid">
        <Button
          variant={selectedContentType === 'All' ? 'primary' : 'outline-primary'}
          onClick={() => onSelectContentType('All')}
          className="filter-grid-btn"
        >
          All
        </Button>
        <Button
          variant={selectedContentType === 'course' ? 'primary' : 'outline-primary'}
          onClick={() => onSelectContentType('course')}
          className="filter-grid-btn"
        >
          Courses
        </Button>
        <Button
          variant={selectedContentType === 'learning_path' ? 'primary' : 'outline-primary'}
          onClick={() => onSelectContentType('learning_path')}
          className="filter-grid-btn"
        >
          Paths
        </Button>
      </div>
    </div>

    {/* My Progress Section */}
    <div className="filter-section">
      <h5 className="filter-section-title">My Progress</h5>
      <div className="status-filter-checkboxes">
        <Form.Check
          type="checkbox"
          id="status-in-progress"
          label="In progress"
          checked={selectedStatuses.includes('In progress')}
          onChange={(e) => onChangeStatus('In progress', e.target.checked)}
          className="filter-checkbox"
        />
        <Form.Check
          type="checkbox"
          id="status-not-started"
          label="Not started"
          checked={selectedStatuses.includes('Not started')}
          onChange={(e) => onChangeStatus('Not started', e.target.checked)}
          className="filter-checkbox"
        />
        <Form.Check
          type="checkbox"
          id="status-completed"
          label="Completed"
          checked={selectedStatuses.includes('Completed')}
          onChange={(e) => onChangeStatus('Completed', e.target.checked)}
          className="filter-checkbox"
        />
      </div>
    </div>

    {/* Date Status Section */}
    <div className="filter-section">
      <h5 className="filter-section-title">Course / Path Status</h5>
      <div className="status-filter-checkboxes">
        <Form.Check
          type="checkbox"
          id="date-status-open"
          label="Open"
          checked={selectedDateStatuses.includes('Open')}
          onChange={(e) => onChangeDateStatus('Open', e.target.checked)}
          className="filter-checkbox"
        />
        <Form.Check
          type="checkbox"
          id="date-status-upcoming"
          label="Upcoming"
          checked={selectedDateStatuses.includes('Upcoming')}
          onChange={(e) => onChangeDateStatus('Upcoming', e.target.checked)}
          className="filter-checkbox"
        />
        <Form.Check
          type="checkbox"
          id="date-status-ended"
          label="Ended"
          checked={selectedDateStatuses.includes('Ended')}
          onChange={(e) => onChangeDateStatus('Ended', e.target.checked)}
          className="filter-checkbox"
        />
      </div>
    </div>

    {/* Organization Section */}
    {organizations && Object.keys(organizations).length > 0 && (
      <div className="filter-section">
        <h5 className="filter-section-title">Program Type</h5>
        <div className="status-filter-checkboxes">
          {Object.entries(organizations).map(([shortName, org]) => (
            <Form.Check
              key={shortName}
              type="checkbox"
              id={`org-${shortName}`}
              label={org.name || shortName}
              checked={selectedOrgs.includes(shortName)}
              onChange={(e) => onChangeOrg(shortName, e.target.checked)}
              className="filter-checkbox"
            />
          ))}
        </div>
      </div>
    )}

    {/* Action Buttons */}
    {isSmall && (
      <div className="filter-actions">
        <ButtonGroup className="w-100">
          <Button variant="outline-secondary" onClick={onClearAll}>Clear all</Button>
          <Button variant="primary" onClick={onClose}>Apply</Button>
        </ButtonGroup>
      </div>
    )}
  </div>
);

FilterPanel.propTypes = {
  selectedContentType: PropTypes.oneOf(['All', 'course', 'learning_path']).isRequired,
  onSelectContentType: PropTypes.func.isRequired,
  selectedStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeStatus: PropTypes.func.isRequired,
  selectedDateStatuses: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeDateStatus: PropTypes.func.isRequired,
  selectedOrgs: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChangeOrg: PropTypes.func.isRequired,
  organizations: PropTypes.objectOf(
    PropTypes.shape({
      name: PropTypes.string,
      shortName: PropTypes.string,
    }),
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  isSmall: PropTypes.bool.isRequired,
  onClearAll: PropTypes.func.isRequired,
};

export default FilterPanel;
