let pomodoroInterval;
let pomodoroTimeLeft = 1500; // 25 minutes
let isPomodoroPaused = true;
let pomodoroSessions = 0;
let isBreakTime = false;

let customInterval;
let customTimeLeft = 0;
let isCustomPaused = true;

let tasks = [];

function addTask() {
    const taskInput = document.getElementById('taskInput');
    const taskDuration = document.getElementById('taskDuration').value;
    const task = {
        name: taskInput.value,
        duration: taskDuration,
        completed: false,
        subTasks: []
    };
    tasks.push(task);
    taskInput.value = '';
    updateTaskLists();
}

function addSubTask(taskIndex) {
    if (tasks[taskIndex].duration === 'long') {
        const subTaskName = prompt("Enter sub-task name:");
        if (subTaskName) {
            tasks[taskIndex].subTasks.push({ name: subTaskName, completed: false });
            updateTaskLists();
        }
    } else {
        alert("Sub-tasks can only be added to long tasks.");
    }
}

function updateTaskLists() {
    const taskListHtml = tasks.map((task, taskIndex) => `
        <li class="${task.completed ? 'completed' : ''}">
            <span onclick="toggleTaskCompletion(${taskIndex})">
                ${task.name} - ${task.duration}
            </span>
            <button onclick="event.stopPropagation(); deleteTask(${taskIndex})" class="delete-btn">
                <i class="fas fa-trash"></i>
            </button>
            ${task.duration === 'long' ? `
                <button onclick="event.stopPropagation(); addSubTask(${taskIndex})">Add Sub-task</button>
                <button onclick="event.stopPropagation(); generateSubTasksForTask(${taskIndex})">AI Generate Sub-tasks</button>
            ` : ''}
            <ul class="sub-task-list">
                ${task.subTasks.map((subTask, subTaskIndex) => `
                    <li class="${subTask.completed ? 'completed' : ''}" onclick="toggleSubTaskCompletion(${taskIndex}, ${subTaskIndex})">
                        ${subTask.name}
                    </li>
                `).join('')}
            </ul>
        </li>
    `).join('');
    document.getElementById('taskList').innerHTML = taskListHtml;
}

function toggleTaskCompletion(taskIndex) {
    tasks[taskIndex].completed = !tasks[taskIndex].completed;
    if (tasks[taskIndex].completed) {
        tasks[taskIndex].subTasks.forEach(subTask => subTask.completed = true);
    }
    updateTaskLists();
}

function toggleSubTaskCompletion(taskIndex, subTaskIndex) {
    tasks[taskIndex].subTasks[subTaskIndex].completed = !tasks[taskIndex].subTasks[subTaskIndex].completed;
    updateTaskLists();
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const totalPomodoroTime = isBreakTime ? 300 : 1500; // 5 min break or 25 min work
    updateProgressBar('pomodoroProgress', totalPomodoroTime - pomodoroTimeLeft, totalPomodoroTime);
}

function startPomodoro() {
    if (isPomodoroPaused) {
        isPomodoroPaused = false;
        pomodoroInterval = setInterval(() => {
            if (pomodoroTimeLeft > 0) {
                pomodoroTimeLeft--;
                updatePomodoroDisplay();
            } else {
                clearInterval(pomodoroInterval);
                pomodoroSessions++;
                document.getElementById('pomodoroSessions').textContent = pomodoroSessions;
                isBreakTime = !isBreakTime;
                pomodoroTimeLeft = isBreakTime ? 300 : 1500; // 5 min break or 25 min work
                updatePomodoroDisplay();
                startPomodoro();
            }
        }, 1000);
    }
    const pomodoroProgress = document.getElementById('pomodoroProgress');
    pomodoroProgress.style.animation = 'progressAnimation 25s linear forwards';
}

function pausePomodoro() {
    if (!isPomodoroPaused) {
        clearInterval(pomodoroInterval);
        isPomodoroPaused = true;
    }
}

function stopPomodoro() {
    clearInterval(pomodoroInterval);
    isPomodoroPaused = true;
    pomodoroTimeLeft = 1500;
    isBreakTime = false;
    updatePomodoroDisplay();
}

function updateProgressBar(id, current, total) {
    const percentage = (current / total) * 100;
    document.getElementById(id).style.width = `${percentage}%`;
}

function startCustomTimer() {
    const minutes = parseInt(document.getElementById('customMinutes').value, 10) || 0;
    const seconds = parseInt(document.getElementById('customSeconds').value, 10) || 0;
    customTimeLeft = minutes * 60 + seconds;

    if (isCustomPaused && customTimeLeft > 0) {
        isCustomPaused = false;
        customInterval = setInterval(() => {
            if (customTimeLeft > 0) {
                customTimeLeft--;
                updateCustomDisplay();
            } else {
                clearInterval(customInterval);
                isCustomPaused = true;
            }
        }, 1000);
    }
    const customProgress = document.getElementById('customProgress');
    customProgress.style.animation = 'progressAnimation 25s linear forwards';
}

function pauseCustomTimer() {
    if (!isCustomPaused) {
        clearInterval(customInterval);
        isCustomPaused = true;
    }
}

function stopCustomTimer() {
    clearInterval(customInterval);
    isCustomPaused = true;
    customTimeLeft = 0;
    updateCustomDisplay();
}

function updateCustomDisplay() {
    const minutes = Math.floor(customTimeLeft / 60);
    const seconds = customTimeLeft % 60;
    document.getElementById('customTimer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    updateProgressBar('customProgress', customTimeLeft, customTimeLeft + 1);
}

function showSection(sectionId) {
    document.querySelectorAll('.container').forEach(container => {
        container.classList.remove('active');
        container.style.display = 'none';
    });

    const section = document.getElementById(sectionId);
    section.style.display = 'flex';
    setTimeout(() => section.classList.add('active'), 10);
}

document.getElementById('startPomodoroBtn').onclick = startPomodoro;
document.getElementById('pausePomodoroBtn').onclick = pausePomodoro;
document.getElementById('stopPomodoroBtn').onclick = stopPomodoro;

document.getElementById('startCustomBtn').onclick = startCustomTimer;
document.getElementById('pauseCustomBtn').onclick = pauseCustomTimer;
document.getElementById('stopCustomBtn').onclick = stopCustomTimer;

showSection('home'); // Ensure the home page is displayed on load
updatePomodoroDisplay();
updateCustomDisplay();
function generateSubTasksForTask(taskIndex) {
    const taskDescription = tasks[taskIndex].name;
    
    fetch('/generate-subtasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskDescription })
    })
    .then(response => response.json())
    .then(data => {
        tasks[taskIndex].subTasks = data.subTasks.map(subTask => ({ name: subTask, completed: false }));
        updateTaskLists();
    })
    .catch(error => console.error('Error generating sub-tasks:', error));
}
// Open the Login Modal
function openLoginModal() {
    document.getElementById("loginModal").style.display = "block";
  }
  
  // Close the Login Modal
  function closeLoginModal() {
    document.getElementById("loginModal").style.display = "none";
  }
  
  // Open the Sign Up Modal
  function openSignUpModal() {
    document.getElementById("signUpModal").style.display = "block";
    document.getElementById("loginModal").style.display = "none"; // Close Login Modal if open
  }
  
  // Close the Sign Up Modal
  function closeSignUpModal() {
    document.getElementById("signUpModal").style.display = "none";
  }
  
  // Close modal if clicked outside the modal content
  window.onclick = function(event) {
    if (event.target === document.getElementById("loginModal")) {
      closeLoginModal();
    } else if (event.target === document.getElementById("signUpModal")) {
      closeSignUpModal();
    }
  }
  function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    console.log('ID: ' + profile.getId()); // Do not send to your backend! Use an ID token instead.
    console.log('Name: ' + profile.getName());
    console.log('Image URL: ' + profile.getImageUrl());
    console.log('Email: ' + profile.getEmail()); // This is null if the 'email' scope is not present.
  }
  
  function onSignIn(googleUser) {
    var profile = googleUser.getBasicProfile();
    var id_token = googleUser.getAuthResponse().id_token;

    // Send the ID token to your Flask backend to verify and store user info
    fetch('/verify-google-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            google_id: profile.getId(),
            email: profile.getEmail(),
            name: profile.getName()
        })
    })
    .then(response => response.json())
    .then(data => {
        // Handle the response from the backend (e.g., display user's progress)
        console.log('User Data:', data);
        alert('Welcome, ' + data.email + '!');
        // Optionally close the modal and update UI based on user data
        document.getElementById('loginModal').style.display = 'none';
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Modal handling (open/close)
// Modal handling
var modal = document.getElementById("signUpLoginModal");
var btn = document.getElementById("signUpLoginBtn");
var span = document.getElementsByClassName("close")[0];

// Open the Sign Up/Login Modal
btn.onclick = function() {
    modal.style.display = "block";
}

// Close the Modal when the user clicks on <span> (x)
span.onclick = function() {
    modal.style.display = "none";
}

// Close the Modal when the user clicks outside of the modal content
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Function to show specific sections
function showSection(sectionId) {
    document.querySelectorAll('.container').forEach(container => {
        container.classList.remove('active');
        container.style.display = 'none';
    });

    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'flex';
        setTimeout(() => section.classList.add('active'), 10);
    }
}

// Usage Tracking: Send a request every minute to update usage
function updateUsage() {
    fetch('/update_usage', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        console.log('Usage updated:', data);
    })
    .catch(error => console.error('Error updating usage:', error));
}

// Set interval to send usage update every 60 seconds
setInterval(updateUsage, 60000);

// Optionally, send a usage update immediately when the page loads
window.onload = function() {
    updateUsage();
}
// Switch between Sign-Up and Sign-In modes
function toggleAuthMode() {
    var title = document.getElementById('modalTitle');
    var toggleLink = document.getElementById('toggleLink');

    // If currently in sign-in mode, switch to sign-up mode
    if (title.innerText === "Login / Sign Up") {
        title.innerText = "Sign Up";
        toggleLink.innerText = "Already have an account? Sign in";
    } else {
        title.innerText = "Login / Sign Up";
        toggleLink.innerText = "Don't have an account? Sign up";
    }
}
  
function addSubTasksAutomatically() {
    const taskIndex = tasks.findIndex(task => task.duration === 'long');
    if (taskIndex !== -1) {
        const taskDescription = tasks[taskIndex].name;
        
        // Make an API call to the Python backend to generate sub-tasks
        fetch('/generate-subtasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ taskDescription })
        })
        .then(response => response.json())
        .then(data => {
            tasks[taskIndex].subTasks = data.subTasks.map(subTask => ({ name: subTask, completed: false }));
            updateTaskLists();
        })
        .catch(error => console.error('Error generating sub-tasks:', error));
    } else {
        alert("No long tasks available for AI sub-task generation.");
    }
}

function deleteTask(taskIndex) {
    tasks.splice(taskIndex, 1);
    updateTaskLists();
}
