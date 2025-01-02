import google.generativeai as genai

# Configure the Google Gemini API client
genai.configure(api_key="YOUR_GOOGLE_GEMINI_API_KEY")  # Replace with your actual API key

# Function to generate sub-tasks using Gemini API
def generate_subtasks(task_description):
    try:
        # Call the Gemini API to generate sub-tasks
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"Generate sub-tasks for the following task using 1-2 words (do not include any symbols only words): {task_description}"
        )
        
        # Extract and format the sub-tasks from the response
        sub_tasks_text = response.text.strip()
        sub_tasks = [sub_task.strip() for sub_task in sub_tasks_text.split('\n') if sub_task.strip()]
        
        return sub_tasks
    except Exception as e:
        print(f"Error generating sub-tasks: {e}")
        return []