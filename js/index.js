const API_URL = "http://localhost:3000";

let jobs = [];
let applications = [];

const statusOptions = [
  "Applied",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
];

const jobList = document.getElementById("job-list");
const savedList = document.getElementById("saved-list");
const applicationList = document.getElementById("application-list");

const jobSearch = document.getElementById("job-search");
const jobLocation = document.getElementById("job-location");
const jobType = document.getElementById("job-type");

function readSavedJobs() {
  try {
    const saved = JSON.parse(localStorage.getItem("jobtrack-saved") || "[]");

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

let savedJobs = readSavedJobs();

function saveSavedJobs() {
  localStorage.setItem("jobtracker-saved", JSON.stringify(savedJobs));
}

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function fetchJobs() {
  try {
    jobs = await apiRequest("/jobs");

    showJobs();
    showSavedJobs();
    updateDashboard();

    document.getElementById("job-results-message").textContent =
      `${jobs.length} jobs available`;
  } catch (error) {
    console.error("Error fetching jobs:", error);

    document.getElementById("job-results-message").textContent =
      "Could not load jobs.";
  }
}

async function fetchApplications() {
  try {
    applications = await apiRequest("/applications");

    showJobs();
    showSavedJobs();
    showApplications();
    updateDashboard();
  } catch (error) {
    console.error("Error fetching applications:", error);
  }
}

function showJobs(list = jobs) {
  document.getElementById("job-results-message").textContent =
    `${list.length} job${list.length === 1 ? "" : "s"} found`;

  if (list.length === 0) {
    jobList.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h5>No jobs found</h5>
                    <p>Try a different search or filter.</p>
                </div>
            </div>
        `;
    return;
  }

  jobList.innerHTML = list
    .map((job) => {
      const isSaved =
        savedJobs.includes(Number(job.id)) || savedJobs.includes(job.id);

      const application = applications.find(
        (app) => String(app.jobId) === String(job.id),
      );

      return `
            
        `;
    })
    .join("");
}

function filterJobs() {
  const keyword = jobSearch.value.trim().toLowerCase();
  const location = jobLocation.value.trim().toLowerCase();
  const type = jobType.value;

  const filteredJobs = jobs.filter((job) => {
    const searchableText = [
      job.title,
      job.company,
      job.description,
      job.category,
    ]
      .join(" ")
      .toLowerCase();

    return (
      searchableText.includes(keyword) &&
      job.location.toLowerCase().includes(location) &&
      (!type || job.type === type)
    );
  });

  showJobs(filteredJobs);
}

jobSearch.addEventListener("input", filterJobs);
jobLocation.addEventListener("input", filterJobs);
jobType.addEventListener("change", filterJobs);

document.getElementById("clear-filters").addEventListener("click", () => {
  jobSearch.value = "";
  jobLocation.value = "";
  jobType.value = "";

  filterJobs();
});

document.getElementById("home-search").addEventListener("submit", (event) => {
  event.preventDefault();

  jobSearch.value = document.getElementById("home-keyword").value;
  jobLocation.value = document.getElementById("home-location").value;
  jobType.value = "";

  filterJobs();

  document.getElementById("jobs").scrollIntoView({
    behavior: "smooth",
  });
});

function toggleSavedJob(id) {
  const saved = savedJobs.some((savedId) => String(savedId) === String(id));

  if (saved) {
    savedJobs = savedJobs.filter((savedId) => String(savedId) !== String(id));
  } else {
    savedJobs.push(id);
  }

  saveSavedJobs();

  filterJobs();
  showSavedJobs();
  updateDashboard();
}

function showSavedJobs() {
  const saved = jobs.filter((job) =>
    savedJobs.some((savedId) => String(savedId) === String(job.id)),
  );

  if (saved.length === 0) {
    savedList.innerHTML = `
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-bookmark-heart"></i>
                    <h5>No saved jobs yet</h5>
                    <p>Bookmark jobs to find them here later.</p>
                </div>
            </div>
        `;
    return;
  }

  savedList.innerHTML = saved
    .map((job) => {
      const application = applications.find(
        (app) => String(app.jobId) === String(job.id),
      );

      return `
            <div class="col-md-6 col-lg-4">
                <article class="job-card">
                    <div class="job-card-top">
                        <div class="company-icon">
                            ${job.company.charAt(0)}
                        </div>

                        <span class="job-type-badge">
                            ${job.type}
                        </span>
                    </div>

                    <h5>${job.title}</h5>

                    <p class="job-company">
                        ${job.company}
                    </p>

                    <div class="job-meta">
                        <span>
                            <i class="bi bi-geo-alt"></i>
                            ${job.location}
                        </span>
                    </div>

                    <p class="job-description">
                        ${job.description}
                    </p>

                    <div class="job-actions">
                        <button
                            class="btn btn-primary apply-job"
                            data-id="${job.id}"
                            ${application ? "disabled" : ""}
                        >
                            ${application ? "Applied" : "Apply"}
                        </button>

                        <button
                            class="btn btn-outline-secondary remove-saved"
                            data-id="${job.id}"
                        >
                            Remove
                        </button>
                    </div>
                </article>
            </div>
        `;
    })
    .join("");
}

// ================= APPLY FOR JOB =================

async function applyForJob(id) {
  const alreadyApplied = applications.some(
    (app) => String(app.jobId) === String(id),
  );

  if (alreadyApplied) {
    return;
  }

  const job = jobs.find((item) => String(item.id) === String(id));

  if (!job) {
    alert("This job could not be found.");
    return;
  }

  const applyButtons = document.querySelectorAll(
    `.apply-job[data-id="${CSS.escape(String(id))}"]`,
  );

  applyButtons.forEach((button) => {
    button.disabled = true;
    button.textContent = "Applying...";
  });

  try {
    // POST creates a new application record in db.json.
    const newApplication = await apiRequest("/applications", {
      method: "POST",
      body: JSON.stringify({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        dateApplied: new Date().toISOString().slice(0, 10),
        status: "Applied",
      }),
    });

    applications.push(newApplication);

    showJobs();
    showSavedJobs();
    showApplications();
    updateDashboard();

    alert("Application saved successfully!");
  } catch (error) {
    console.error("Error submitting application:", error);

    alert("Could not submit your application. Please try again.");

    showJobs();
    showSavedJobs();
  }
}

function showApplications() {
  if (applications.length === 0) {
    applicationList.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    No applications yet. Browse jobs and click Apply
                    to start tracking your progress.
                </td>
            </tr>
        `;
    return;
  }

  applicationList.innerHTML = applications
    .map((app) => {
      const job = jobs.find((item) => String(item.id) === String(app.jobId));

      const title = app.jobTitle || job?.title || "Unknown job";
      const company = app.company || job?.company || "Unknown company";

      const statusClass =
        {
          Applied: "status-pending",
          Interview: "status-interview",
          Offer: "status-offer",
          Rejected: "status-rejected",
          Withdrawn: "status-withdrawn",
        }[app.status] || "status-pending";

      const options = statusOptions
        .map(
          (status) => `
            <option
                value="${status}"
                ${app.status === status ? "selected" : ""}
            >
                ${status}
            </option>
        `,
        )
        .join("");

      return `
            <tr>
                <td class="fw-semibold">
                    ${title}
                </td>

                <td>${company}</td>

                <td>${app.dateApplied}</td>

                <td>
                    <span class="status-badge ${statusClass}">
                        ${app.status}
                    </span>
                </td>

                <td>
                    <select
                        class="form-select status-select"
                        data-id="${app.id}"
                        aria-label="Update status for ${title}"
                    >
                        ${options}
                    </select>
                </td>
            </tr>
        `;
    })
    .join("");
}

// PATCH updates the application on the server.
applicationList.addEventListener("change", async (event) => {
  const select = event.target.closest(".status-select");

  if (!select) {
    return;
  }

  const applicationId = select.dataset.id;
  const newStatus = select.value;

  if (!statusOptions.includes(newStatus)) {
    return;
  }

  const application = applications.find(
    (app) => String(app.id) === String(applicationId),
  );

  if (!application || application.status === newStatus) {
    return;
  }

  const previousStatus = application.status;
  select.disabled = true;

  try {
    const updatedApplication = await apiRequest(
      `/applications/${encodeURIComponent(applicationId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      },
    );

    applications = applications.map((app) =>
      String(app.id) === String(applicationId) ? updatedApplication : app,
    );

    showApplications();
    updateDashboard();
  } catch (error) {
    console.error("Error updating application:", error);

    alert("Could not update the application status.");

    application.status = previousStatus;
    showApplications();
  }
});

// ================= DASHBOARD =================

function updateDashboard() {
  const total = applications.length;

  const interviews = applications.filter(
    (app) => app.status === "Interview",
  ).length;

  document.getElementById("available-count").textContent = jobs.length;
  document.getElementById("application-count").textContent = total;
  document.getElementById("saved-count").textContent = savedJobs.length;
  document.getElementById("interview-count").textContent = interviews;
}

// Handles buttons in both Find Jobs and Saved Jobs.
document.addEventListener("click", (event) => {
  const applyButton = event.target.closest(".apply-job");
  const saveButton = event.target.closest(".save-job");
  const removeButton = event.target.closest(".remove-saved");

  if (applyButton && !applyButton.disabled) {
    applyForJob(applyButton.dataset.id);
  }

  if (saveButton) {
    toggleSavedJob(saveButton.dataset.id);
  }

  if (removeButton) {
    toggleSavedJob(removeButton.dataset.id);
  }
});

// Update the active navigation item.
document.querySelectorAll(".navbar .nav-link, .nav-cta").forEach((link) => {
  link.addEventListener("click", () => {
    const target = link.getAttribute("href");

    document.querySelectorAll(".navbar .nav-link").forEach((navLink) => {
      navLink.classList.toggle(
        "active",
        navLink.getAttribute("href") === target,
      );
    });
  });
});

document.getElementById("current-year").textContent = new Date().getFullYear();

async function initializeApp() {
  await Promise.all([fetchJobs(), fetchApplications()]);
}

initializeApp();
