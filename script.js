const chatBox = document.getElementById("chat");
const input = document.getElementById("userInput");
const modelSelect = document.getElementById("modelSelect");
const imageInput = document.getElementById("imageInput");
const imageButton = document.getElementById("imageButton");
const imagePreview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");

let selectedImage = null;

// Get or ask API Key
let API_KEY = localStorage.getItem("openrouter_api_key");

if (!API_KEY) {
  API_KEY = prompt("Enter your OpenRouter API Key:");
  localStorage.setItem("openrouter_api_key", API_KEY);
}

// Handle image selection
imageInput.addEventListener("change", function(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      selectedImage = {
        data: e.target.result,
        type: file.type,
        name: file.name
      };

      // Show preview
      previewImg.src = selectedImage.data;
      imagePreview.classList.remove("hidden");

      // Change button appearance to indicate image is selected
      imageButton.textContent = "📸";
      imageButton.classList.add("bg-green-600");
      imageButton.classList.remove("bg-gray-600");
    };
    reader.readAsDataURL(file);
  }
});

// Clear selected image
function clearImage() {
  selectedImage = null;
  imageInput.value = "";
  imagePreview.classList.add("hidden");
  imageButton.textContent = "📷";
  imageButton.classList.remove("bg-green-600");
  imageButton.classList.add("bg-gray-600");
}

// Convert image to base64 for API
function getImageBase64(imageData) {
  if (!imageData) return null;
  return imageData.data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
}

// Add message to UI
function addMessage(content, sender, image = null) {
  const div = document.createElement("div");

  div.className = sender === "user"
    ? "text-right mb-4"
    : "text-left mb-4";

  if (image) {
    // Create container for image and text
    const container = document.createElement("div");
    container.className = sender === "user" ? "inline-block max-w-xs" : "inline-block max-w-xs";

    // Add image
    const img = document.createElement("img");
    img.src = image.data;
    img.alt = image.name;
    img.className = "rounded-lg mb-2 max-w-full h-auto block";
    img.style.maxWidth = "200px";
    img.style.maxHeight = "200px";
    container.appendChild(img);

    // Add text if present
    if (content && content !== "[Image]") {
      const textSpan = document.createElement("span");
      textSpan.className = `inline-block px-4 py-2 rounded-lg ${
        sender === "user" ? "bg-blue-600" : "bg-gray-700"
      }`;
      textSpan.textContent = content;
      container.appendChild(textSpan);
    }

    div.appendChild(container);
  } else {
    // Text only message
    div.innerHTML = `
      <span class="inline-block px-4 py-2 rounded-lg 
      ${sender === "user" ? "bg-blue-600" : "bg-gray-700"}">
        ${content}
      </span>
    `;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Send message
async function sendMessage() {
  const message = input.value.trim();
  const hasImage = selectedImage !== null;
  const imageData = selectedImage; // Store image data before clearing

  if (!message && !hasImage) return;

  // Display user message with image if present
  addMessage(message || "[Image]", "user", hasImage ? imageData : null);

  input.value = "";
  selectedImage = null; // Clear the selected image
  imageInput.value = ""; // Clear the file input
  // Reset button appearance and hide preview
  imageButton.textContent = "📷";
  imageButton.classList.remove("bg-green-600");
  imageButton.classList.add("bg-gray-600");
  imagePreview.classList.add("hidden");

  addMessage("Typing...", "bot");

  try {
    // Prepare message content
    let messageContent;
    if (hasImage && message) {
      // Both text and image
      messageContent = [
        { type: "text", text: message },
        {
          type: "image_url",
          image_url: {
            url: `data:${imageData.type};base64,${getImageBase64(imageData)}`
          }
        }
      ];
    } else if (hasImage) {
      // Image only
      messageContent = [
        {
          type: "image_url",
          image_url: {
            url: `data:${imageData.type};base64,${getImageBase64(imageData)}`
          }
        }
      ];
    } else {
      // Text only
      messageContent = message;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelSelect.value,
        messages: [
          { role: "user", content: messageContent }
        ]
      })
    });

    const data = await response.json();

    // Remove typing message
    chatBox.lastChild.remove();

    const reply = data.choices?.[0]?.message?.content || "No response";

    addMessage(reply, "bot");

  } catch (error) {
    chatBox.lastChild.remove();
    addMessage("Error: " + error.message, "bot");
  }
}

// Enter key support
input.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    sendMessage();
  }
});



