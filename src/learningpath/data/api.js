import { getAuthenticatedHttpClient, getAuthenticatedUser } from '@edx/frontend-platform/auth';
import { getConfig, camelCaseObject } from '@edx/frontend-platform';

export async function fetchLearningPaths() {
  const client = getAuthenticatedHttpClient();
  // FIXME: This API has pagination.
  const response = await client.get(`${getConfig().LMS_BASE_URL}/api/learning_paths/v1/learning-paths/`);
  const data = response.data.results || response.data;
  return camelCaseObject(data);
}

export async function fetchLearningPathDetail(key) {
  const client = getAuthenticatedHttpClient();
  const response = await client.get(`${getConfig().LMS_BASE_URL}/api/learning_paths/v1/learning-paths/${key}/`);
  return camelCaseObject(response.data);
}

export async function fetchLearnerDashboard() {
  const response = await getAuthenticatedHttpClient().get(`${getConfig().LMS_BASE_URL}/api/learner_home/init/`);
  const courses = response.data.courses || [];
  const emailConfirmation = response.data.emailConfirmation || {};
  const enterpriseDashboard = response.data.enterpriseDashboard || {};

  const processedCourses = camelCaseObject(courses.map(course => {
    const { courseRun, course: courseInfo, enrollment } = course;

    return {
      id: courseRun.courseId,
      number: courseRun.courseId.split(':')[1].split('+')[1],
      org: courseRun.courseId.split(':')[1].split('+')[0],
      run: courseRun.courseId.split(':')[1].split('+')[2],
      name: courseInfo.courseName,
      shortDescription: null,
      endDate: courseRun.endDate,
      startDate: courseRun.startDate,
      courseImageAssetPath: courseInfo.bannerImgSrc,
      isStarted: courseRun.isStarted,
      isArchived: courseRun.isArchived,
      enrollmentDate: enrollment?.lastEnrolled || null,
    };
  }));

  return {
    courses: processedCourses,
    emailConfirmation: camelCaseObject(emailConfirmation),
    enterpriseDashboard: camelCaseObject(enterpriseDashboard),
  };
}

export async function fetchCourseDetails(courseId) {
  const response = await getAuthenticatedHttpClient().get(
    `${getConfig().LMS_BASE_URL}/api/courses/v1/courses/${encodeURIComponent(courseId)}/`,
  );
  const { data } = response;

  // Extract prerequisites section from HTML overview
  let prerequisitesHtml = null;
  if (data.overview) {
    const prereqMatch = data.overview.match(
      /<section class="prerequisites">([\s\S]*?)<\/section>/i,
    );
    if (prereqMatch) {
      [, prerequisitesHtml] = prereqMatch;
    }
  }

  return camelCaseObject({
    id: data.course_id,
    courseKey: data.course_id,
    number: data.number,
    org: data.org,
    run: data.id.split(':')[1].split('+')[2],
    name: data.name,
    displayName: data.name, // Use name as displayName for consistency with discovery API
    shortDescription: data.short_description,
    endDate: data.end,
    startDate: data.start,
    courseImageAssetPath: data.media.course_image.uri,
    description: data.overview,
    selfPaced: data.pacing === 'self',
    duration: data.effort,
    prerequisitesHtml,
  });
}

export async function fetchCourseCompletion(courseId) {
  try {
    const { username } = getAuthenticatedUser();
    const client = getAuthenticatedHttpClient();
    const response = await client.get(
      `${getConfig().LMS_BASE_URL}/completion-aggregator/v1/course/${encodeURIComponent(courseId)}/?username=${username}`,
    );
    return response.data.results?.[0]?.completion?.percent ?? 0.0;
  } catch (error) {
    // Handle API errors - they indicate the user is not enrolled or did not complete any XBlocks.
    return 0.0;
  }
}

export async function fetchAllCourseCompletions() {
  const { username } = getAuthenticatedUser();
  const client = getAuthenticatedHttpClient();

  let allResults = [];
  let nextUrl = `${getConfig().LMS_BASE_URL}/completion-aggregator/v1/course/?username=${username}&page_size=10000`;

  while (nextUrl) {
    // eslint-disable-next-line no-await-in-loop
    const response = await client.get(nextUrl);
    const results = response.data.results || [];

    allResults = [...allResults, ...results];

    nextUrl = response.data.pagination?.next ? response.data.pagination.next : null;
  }

  return camelCaseObject(allResults.map(item => ({
    course_key: item.course_key,
    completion: item.completion,
  })));
}

export async function enrollInLearningPath(learningPathId) {
  const client = getAuthenticatedHttpClient();
  try {
    const response = await client.post(
      `${getConfig().LMS_BASE_URL}/api/learning_paths/v1/${learningPathId}/enrollments/`,
    );
    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error,
    };
  }
}

export async function enrollInCourse(learningPathId, courseId) {
  const client = getAuthenticatedHttpClient();
  try {
    const response = await client.post(
      `${getConfig().LMS_BASE_URL}/api/learning_paths/v1/${learningPathId}/enrollments/${courseId}/`,
    );
    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error,
    };
  }
}

export async function fetchCourseEnrollmentStatus(courseId) {
  const client = getAuthenticatedHttpClient();
  try {
    const response = await client.get(
      `${getConfig().LMS_BASE_URL}/api/enrollment/v1/enrollment/${courseId}`,
    );
    return {
      isEnrolled: response.data?.is_active === true,
      data: camelCaseObject(response.data),
    };
  } catch (error) {
    // Handle API errors - they indicate the user is not enrolled.
    return {
      isEnrolled: false,
      error,
    };
  }
}

export async function fetchOrganizations() {
  const client = getAuthenticatedHttpClient();

  let allResults = [];
  let nextUrl = `${getConfig().LMS_BASE_URL}/api/organizations/v0/organizations/?page_size=100`;

  while (nextUrl) {
    // eslint-disable-next-line no-await-in-loop
    const response = await client.get(nextUrl);
    const results = response.data.results || [];
    allResults = [...allResults, ...results];
    nextUrl = response.data.next || null;
  }

  return camelCaseObject(allResults.map(org => ({
    shortName: org.short_name,
    name: org.name,
    logo: org.logo,
  })));
}

// Fetch all available taxonomies from OpenEdX content_tagging (CMS API)
export async function fetchTaxonomies() {
  const client = getAuthenticatedHttpClient();
  const cmsBaseUrl = getConfig().STUDIO_BASE_URL || getConfig().CMS_BASE_URL || getConfig().LMS_BASE_URL.replace('lms', 'studio');
  const response = await client.get(
    `${cmsBaseUrl}/api/content_tagging/v1/taxonomies/`,
  );
  // eslint-disable-next-line no-console
  console.log('=== Taxonomies API Response ===', response.data);
  return camelCaseObject(response.data);
}

// Fetch all object tags (for all courses) from our custom learning-paths endpoint
export async function fetchAllObjectTags() {
  const client = getAuthenticatedHttpClient();

  try {
    const response = await client.get(
      `${getConfig().LMS_BASE_URL}/api/learning_paths/v1/all_object_tags/`,
    );

    // eslint-disable-next-line no-console
    console.log('=== All Object Tags ===', response.data);

    // Response format: {object_id: {tags: [...], taxonomies: {...}}}
    // We need to preserve the top-level keys (course IDs) but camelCase the nested values
    const result = {};
    Object.entries(response.data).forEach(([courseId, data]) => {
      result[courseId] = camelCaseObject(data);
    });

    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching all object tags:', error);
    return {};
  }
}

// Fetch tags for a specific course from OpenEdX content_tagging (CMS API)
// The API returns: {object_id: {taxonomies: [{taxonomy_id, can_tag_object,
// tags: [{value, lineage, can_delete_objecttag}]}]}}
export async function fetchCourseContentTags(courseKey) {
  const client = getAuthenticatedHttpClient();
  const cmsBaseUrl = getConfig().STUDIO_BASE_URL || getConfig().CMS_BASE_URL || getConfig().LMS_BASE_URL.replace('lms', 'studio');

  // Note: object_id is a path parameter, not a query parameter
  const response = await client.get(
    `${cmsBaseUrl}/api/content_tagging/v1/object_tags/${encodeURIComponent(courseKey)}/`,
  );

  // eslint-disable-next-line no-console
  console.log(`=== Course Content Tags for ${courseKey} ===`, response.data);

  // Transform the response structure
  // Response format: {course_key: {taxonomies: [{taxonomy_id, tags: [{value, lineage}]}]}}
  const data = response.data[courseKey];
  if (!data || !data.taxonomies) {
    return { results: [], taxonomies: {} };
  }

  // Flatten the nested structure to match our expected format
  const results = [];
  const taxonomies = {};

  data.taxonomies.forEach(taxonomy => {
    // Store taxonomy info
    taxonomies[taxonomy.taxonomy_id] = {
      id: taxonomy.taxonomy_id,
      name: taxonomy.name || `Taxonomy ${taxonomy.taxonomy_id}`,
    };

    // Flatten tags
    if (taxonomy.tags) {
      taxonomy.tags.forEach(tag => {
        results.push({
          value: tag.value,
          lineage: tag.lineage,
          taxonomyId: taxonomy.taxonomy_id,
          canDelete: tag.can_delete_objecttag,
        });
      });
    }
  });

  return camelCaseObject({ results, taxonomies });
}

// Fetch tags within a specific taxonomy (CMS API)
export async function fetchTaxonomyTags(taxonomyId) {
  const client = getAuthenticatedHttpClient();
  const cmsBaseUrl = getConfig().STUDIO_BASE_URL || getConfig().CMS_BASE_URL || getConfig().LMS_BASE_URL.replace('lms', 'studio');
  const response = await client.get(
    `${cmsBaseUrl}/api/content_tagging/v1/taxonomies/${taxonomyId}/tags/`,
  );
  return camelCaseObject(response.data);
}

export async function enrollInSelfPacedCourse(courseId) {
  const client = getAuthenticatedHttpClient();
  try {
    const formData = new URLSearchParams();
    formData.append('course_id', courseId);
    formData.append('enrollment_action', 'enroll');

    const response = await client.post(
      `${getConfig().LMS_BASE_URL}/change_enrollment`,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    );

    return {
      success: true,
      data: camelCaseObject(response.data),
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

export async function fetchCoursePrerequisites(courseId) {
  const client = getAuthenticatedHttpClient();
  try {
    const response = await client.get(
      `${getConfig().LMS_BASE_URL}/api/learning_paths/v1/courses/${encodeURIComponent(courseId)}/prerequisites/`,
    );
    return camelCaseObject(response.data);
  } catch (error) {
    // If endpoint doesn't exist (404) or milestones not available, return null
    if (error.response?.status === 404) {
      return null;
    }
    // eslint-disable-next-line no-console
    console.error('Error fetching course prerequisites:', error);
    return null;
  }
}

export async function fetchCourseDiscovery({ searchString = '', pageSize = 20, pageIndex = 0 } = {}) {
  const client = getAuthenticatedHttpClient();

  try {
    const lmsBaseUrl = getConfig().LMS_BASE_URL;
    const url = `${lmsBaseUrl}/search/course_discovery/`;

    // eslint-disable-next-line no-console
    console.log('=== Course Discovery Debug Info ===');
    // eslint-disable-next-line no-console
    console.log('LMS_BASE_URL:', lmsBaseUrl);
    // eslint-disable-next-line no-console
    console.log('Full API URL:', url);
    // eslint-disable-next-line no-console
    console.log('Attempting to fetch courses...');

    // Create form data as expected by the endpoint (same format as curl --data-raw)
    const formData = new URLSearchParams();
    formData.append('search_string', searchString);
    formData.append('page_size', pageSize.toString());
    formData.append('page_index', pageIndex.toString());

    const response = await client.post(
      url,
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    );

    const { results = [] } = response.data;

    // Transform the discovery results - note the data structure from the search endpoint
    const courses = results.map(result => {
      const course = result.data || {};
      return {
        id: course.course,
        courseKey: course.course,
        name: course.content?.number || 'Untitled Course',
        displayName: course.content?.display_name || 'Untitled Course',
        shortDescription: course.content?.short_description || '',
        description: course.content?.overview || '',
        courseImageUrl: course.image_url || '',
        org: course.org || course.course?.split(':')[1]?.split('+')[0] || '',
        number: course.number || course.course?.split(':')[1]?.split('+')[1] || '',
        startDate: course.start,
        endDate: course.end,
        enrollmentStart: course.enrollment_start,
        enrollmentEnd: course.enrollment_end,
        type: 'course',
        isDiscovery: true,
      };
    });

    return {
      courses,
      total: response.data.pagination?.count || courses.length,
      pageIndex,
      pageSize,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error fetching course catalog:', error);
    // eslint-disable-next-line no-console
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
    });

    return {
      courses: [],
      total: 0,
      pageIndex,
      pageSize,
    };
  }
}
