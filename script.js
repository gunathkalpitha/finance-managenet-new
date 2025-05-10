const API_MEMBERS = 'http://localhost:5000/api/members';
const API_TRANSACTIONS = 'http://localhost:5000/api/transactions';
const API_MESSAGES='http://localhost:5000/api/messages';

let currentUser = null;
let totalFunds = 0;
let transactionHistory = [];

window.onload = () => {
  loadMembers();
renderSplitCheckboxes();

 
};

function loadMembers() {
  fetch(`${API_MEMBERS}/get-members`)
    .then(res => res.json())
    .then(members => {
      const loginSelect = document.getElementById("member-select");
      const chatSelect = document.getElementById("chat-with-select");

      if (loginSelect) {
        loginSelect.innerHTML = `<option value="">Select Member</option>`;
        members.forEach(name => {
          loginSelect.add(new Option(name, name));
        });
      }

      if (chatSelect) {
        chatSelect.innerHTML = `<option value="">Select Member</option>`;
        members.forEach(name => {
          if (!currentUser || name !== currentUser.name) {
            chatSelect.add(new Option(name, name));
          }
        });
      }
    })
    .catch(err => console.error("Error loading members:", err));
}

function login() {
  const name = document.getElementById("member-select").value;
  const password = document.getElementById("password").value;

  if (!name || !password) return alert("Enter both name & password.");

  fetch(`${API_MEMBERS}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  })
  .then(r => r.json())
  .then(data => {
    if (data.status === 'success') {
      currentUser = { _id: data.user._id, name: data.user.name };
      document.getElementById("user-name").innerText = currentUser.name;
      document.getElementById("login-section").classList.add("hidden");
      document.getElementById("dashboard").classList.remove("hidden");
      loadMembers();
      loadTransactions();
      
      // Clear the login form
      document.getElementById("member-select").value = "";
      document.getElementById("password").value = "";
    } else {
      alert(data.message);
    }
  })
  .catch(err => console.error("Login error:", err));
}

function logout() {
  currentUser = null;
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("login-section").classList.remove("hidden");
}
function toggleSignup() {
  const signup = document.getElementById("signup-section");
  signup.classList.toggle("hidden");

}

function signup() {
  const name = document.getElementById("new-member-name").value;
  const password = document.getElementById("new-member-password").value;

  if (!name || !password) {
    return alert("Enter both name and password.");
  }

  fetch(`${API_MEMBERS}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  })
  .then(res => res.json())
  .then(data => {
  if (data.message === 'Member created successfully') {

      alert("Signup successful. Please log in.");
      
      // Clear form
      document.getElementById("new-member-name").value = "";
      document.getElementById("new-member-password").value = "";

      // ✅ Reload members list immediately
      loadMembers();
    
    } else {
      alert(data.message || "Signup failed.");
    }
  })
  .catch(err => {
    console.error("Signup error:", err);
    alert("Error during signup.");
  });
}


function submitTransaction() {
  const actionType = document.getElementById('action-type').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const description = document.getElementById('description').value;

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }

  const transaction = { 
    type: actionType, 
    amount, 
    description, 
    userId: currentUser._id, 
    date: new Date().toISOString()
  };

  saveTransaction(transaction);
  resetForm()
 
}

function saveTransaction(transaction) {
  fetch(`${API_TRANSACTIONS}/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transaction)
  })
  .then(r => r.json())
  .then(data => {
    if (data.status === 'success') {
      loadTransactions();
    } else {
      alert("Error saving transaction.");
    }
  })
  .catch(err => {
    console.error("Error adding transaction:", err);
    alert("Failed to save transaction.");
  });
}

function loadTransactions() {
  fetch(`${API_TRANSACTIONS}/all`)
    .then(r => r.json())
    .then(data => {
      
      transactionHistory = data;
      totalFunds = data.reduce((sum, tx) =>
        tx.type === "donate" ? sum + tx.amount : sum - tx.amount, 0);

      updateFundsDisplay();
      renderHistory(); // This will show everyone's transactions
      showFundSummary(); 
    })
    .catch(err => console.error("Error loading transactions:", err));
}
function resetForm() {
  editingTransactionId = null;
  document.getElementById("amount").value = "";
  document.getElementById("description").value = "";
  document.getElementById("action-type").value = "donate";

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.innerText = "Submit";
  submitBtn.onclick = submitTransaction;
}

function showFundSummary() {
  let totalDonated = 0;
  let totalWithdrawn = 0;

  transactionHistory.forEach(tx => {
    if (tx.type === "donate") totalDonated += parseFloat(tx.amount);
    else if (tx.type === "withdraw") totalWithdrawn += parseFloat(tx.amount);
  });

  // Update the DOM elements with the totals
  document.getElementById("donatedAmount").textContent = `Total Donated: Rs. ${totalDonated.toFixed(2)}`;
  document.getElementById("withdrawnAmount").textContent = `Total Withdrawn: Rs. ${totalWithdrawn.toFixed(2)}`;
}








function updateFundsDisplay() {
  const el = document.getElementById("total-funds");
  console.log("Updating total funds:", totalFunds); // 👈 Add this
  if (el) el.innerText = totalFunds.toFixed(2);
}

function renderHistory() {
  const list = document.getElementById("history-list");
  list.innerHTML = "";

  if (!transactionHistory.length) {
    list.innerHTML = `<li style="font-style:italic;">No transactions yet.</li>`;
    return;
  }

  transactionHistory.forEach((tx) => {
    const li = document.createElement("li");
    const txDate = new Date(tx.date);
    const formattedDate = txDate.toLocaleDateString();
    const formattedTime = txDate.toLocaleTimeString();

    const isCurrentUser = tx.userId === currentUser._id;

    li.innerHTML = `
      <div>
        <strong>${tx.member}</strong> ${tx.type === "donate" ? "donated" : "withdrew"} Rs. ${tx.amount}
        <br/>
        <small>${formattedDate} at ${formattedTime}${tx.description ? ` - ${tx.description}` : ""}</small>
        ${isCurrentUser ? `
          <br/>
          <!-- <button class="edit-btn" data-id="${tx._id}">✏️ Edit</button> -->
          <button class="delete-btn" data-id="${tx._id}">🗑️ Delete</button>
        ` : ""}
      </div>
    `;
    list.appendChild(li);
  });

  // 🔧 Add this: event delegation or attach event listeners after DOM is updated
  document.querySelectorAll(".edit-btn").forEach(btn =>
    btn.addEventListener("click", () => editTransaction(btn.dataset.id))
  );
  document.querySelectorAll(".delete-btn").forEach(btn =>
    btn.addEventListener("click", () => deleteTransaction(btn.dataset.id))
  );
}



function handleEdit(e) {
  const id = e.target.dataset.id;
  const tx = transactionHistory.find(t => t._id === id);
  if (!tx) return alert("Transaction not found!");

  // Pre-fill the form with existing values
  document.getElementById("amount").value = tx.amount;
  document.getElementById("description").value = tx.description;
  document.getElementById("type").value = tx.type;

  // Store the editing ID globally
  editingTransactionId = id;
  document.getElementById("submit-btn").textContent = "Update Transaction";
}

function handleDelete(e) {
  const id = e.target.dataset.id;
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  fetch(`/transactions/${id}`, {
    method: "DELETE"
  })
    .then(res => res.json())
    .then(res => {
      if (res.success) {
        transactionHistory = transactionHistory.filter(t => t._id !== id);
        renderHistory();
      } else {
        alert("Failed to delete transaction");
      }
    });
}



function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  fetch(`${API_TRANSACTIONS}/${id}`, {
    method: "DELETE"
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'success') {
        loadTransactions();
      } else {
        alert("Delete failed.");
      }
    })
    .catch(err => console.error("Delete error:", err));
}

let editingTransactionId = null;

function editTransaction(id) {
  const tx = transactionHistory.find(t => t._id === id);
  if (!tx) return alert("Transaction not found");

  document.getElementById("amount").value = tx.amount;
  document.getElementById("description").value = tx.description;
  document.getElementById("action-type").value = tx.type;

  editingTransactionId = id;

  const btn = document.getElementById("submit-btn");
  btn.innerText = "Update";
  btn.onclick = updateTransaction;
}

function updateTransaction() {
  const amount = parseFloat(document.getElementById("amount").value);
  const description = document.getElementById("description").value;
  const type = document.getElementById("action-type").value;

  if (isNaN(amount) || amount <= 0) return alert("Invalid amount");

  fetch(`${API_TRANSACTIONS}/${editingTransactionId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount, description, type })
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === 'success') {
      editingTransactionId = null;
      document.getElementById("submit-btn").innerText = "Submit";
      document.getElementById("submit-btn").onclick = submitTransaction;
      resetForm();
      loadTransactions();
    } else {
      alert("Update failed.");
    }
  })
  .catch(err => console.error("Update error:", err));
}


function exportToCSV() {
  let csvContent = "data:text/csv;charset=utf-8,User,Type,Amount,Description,Time\n";
  transactionHistory.forEach(tx => {
    csvContent += `${tx.member},${tx.type},${tx.amount},${tx.description},${tx.formattedTime}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "transaction_history.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}






function sendMessage() {
  const receiver = document.getElementById("chat-with-select").value;
  const message = document.getElementById("chat-message-input").value;

  if (!receiver || !message) {
    alert("Select a receiver and type a message.");
    return;
  }

  fetch(`${API_MESSAGES}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: currentUser.name,
      receiver,
      content: message
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.message === 'Message sent successfully') {
      document.getElementById("chat-message-input").value = '';
      loadMessages(receiver); // Refresh chat
    } else {
      alert(data.error || "Message failed to send.");
    }
  })
  .catch(err => console.error("Send message error:", err));
}
function loadMessages(withUser) {
  if (!withUser || !currentUser) {
    console.log("Missing user info", withUser, currentUser);
    return;
  }

  fetch(`${API_MESSAGES}/${currentUser.name}/${withUser}`)
    .then(res => res.json())
    .then(messages => {
      const chatBox = document.getElementById("chat-box");
      chatBox.innerHTML = ''; // Clear the chat box

      if (!messages.length) {
        chatBox.innerHTML = '<p>No messages yet.</p>';
        return;
      }

      // Show latest messages first (reversed)
      messages.reverse().forEach(msg => {
        const div = document.createElement("div");

        const isSent = msg.sender === currentUser.name;
        const isGlobal = msg.receiver === "Everyone";

        div.className = `message ${isSent ? "sent" : "received"}${isGlobal ? " global" : ""}`;

        const senderLabel = isSent ? "You" : msg.sender;
        const receiverLabel = msg.receiver === currentUser.name ? "You" : msg.receiver;

        div.innerHTML = `<strong>${senderLabel} to ${receiverLabel}</strong>: ${msg.content}<br>
                         <small>${new Date(msg.timestamp).toLocaleString()}</small><hr>`;

        chatBox.appendChild(div);
      });

      chatBox.scrollTop = 0; // Scroll to top since newest is on top
    })
    .catch(err => console.error("Error loading messages:", err));
}





function calculateSplit() {
    const total = parseFloat(document.getElementById('totalAmount').value);
    const checkboxes = document.querySelectorAll('input[name="split-member"]:checked');
    const results = document.getElementById('results');

    if (isNaN(total) || total <= 0) {
      results.innerHTML = "<p style='color:red;'>Please enter a valid total amount.</p>";
      return;
    }

    if (checkboxes.length === 0) {
      results.innerHTML = "<p style='color:red;'>Please select at least one member.</p>";
      return;
    }

    const perMember = (total / checkboxes.length).toFixed(2);

    let html = `<p>Total: Rs. ${total.toFixed(2)}</p>`;
    html += `<p>Split among ${checkboxes.length} member(s):</p><ul>`;
    checkboxes.forEach(cb => {
      html += `<li>${cb.value}: Rs. ${perMember}</li>`;
    });
    html += "</ul>";

    results.innerHTML = html;
  }
function renderSplitCheckboxes() {
  console.log("📌 renderSplitCheckboxes called");

  fetch(`${API_MEMBERS}/get-members`)
    .then(res => res.json())
    .then(members => {
      console.log("✅ Members fetched:", members); // ADD THIS
      const list = document.getElementById("split-members-list");
      list.innerHTML = ""; 

      members.forEach(member => {
        const name = typeof member === "string" ? member : member.name;
        const label = document.createElement("label");
        label.innerHTML = `<input type="checkbox" name="split-member" value="${name}"> ${name}`;
        list.appendChild(label);
        list.appendChild(document.createElement("br"));
      });
    })
    .catch(err => {
      console.error("❌ Error loading members:", err);
      document.getElementById("split-members-list").innerHTML = "<p style='color:red;'>Failed to load members.</p>";
    });
}
