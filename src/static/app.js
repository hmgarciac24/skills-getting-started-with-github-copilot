document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message and activity select options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = Math.max(0, (details.max_participants || 0) - (details.participants?.length || 0));

        // Basic info
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const participantsTitle = document.createElement("h5");
        participantsTitle.textContent = "Participants";
        participantsDiv.appendChild(participantsTitle);

        if (details.participants && details.participants.length > 0) {
          const ul = document.createElement("ul");
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";
            // avatar with initials from email or name
            const avatar = document.createElement("span");
            avatar.className = "avatar";
            let initials = "";
            if (p && typeof p === "string") {
              const beforeAt = p.split("@")[0];
              const parts = beforeAt.split(/[._-]/).filter(Boolean);
              initials = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : beforeAt.slice(0,2);
            }
            avatar.textContent = (initials || "U").toUpperCase();
            const text = document.createElement("span");
            text.textContent = p;
            li.appendChild(avatar);
            li.appendChild(text);

            // delete button to unregister participant
            const del = document.createElement("button");
            del.className = "delete-participant";
            del.title = "Unregister participant";
            del.setAttribute("aria-label", `Unregister ${p}`);
            del.textContent = "✖";
            // store email and activity on button dataset
            del.dataset.email = p;
            del.dataset.activity = name;
            del.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              // confirm quick action (optional)
              const ok = confirm(`Remove ${p} from ${name}?`);
              if (!ok) return;
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(p)}`,
                  { method: "DELETE" }
                );
                const result = await res.json();
                if (res.ok) {
                  // remove the list item
                  li.remove();
                  // refresh availability and lists
                  fetchActivities();
                } else {
                  alert(result.detail || result.message || "Failed to unregister participant");
                }
              } catch (err) {
                console.error("Error unregistering participant:", err);
                alert("Failed to unregister participant. See console for details.");
              }
            });

            li.appendChild(del);
            ul.appendChild(li);
          });
          participantsDiv.appendChild(ul);
        } else {
          const none = document.createElement("div");
          none.className = "no-participants";
          none.textContent = "No participants yet — be the first!";
          participantsDiv.appendChild(none);
        }

        activityCard.appendChild(participantsDiv);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities so participants and availability update
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
