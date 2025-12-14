// ====== DATA ======
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || {};

// ====== NAVIGATION ======
function showPage(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  if(pageId==='dashboard') renderCharts();
  if(pageId==='history') renderTransactions();
}

// ====== SAVE ======
function saveData(){
  localStorage.setItem('transactions', JSON.stringify(transactions));
  localStorage.setItem('budgets', JSON.stringify(budgets));
}

// ====== ADD TRANSACTIONS ======
function manualAdd(){
  const desc=document.getElementById('desc').value.trim();
  const amount=parseFloat(document.getElementById('amount').value);
  const type=document.getElementById('type').value;
  const category=document.getElementById('category').value;
  addTransaction(desc, amount, type, category);
  document.getElementById('desc').value='';
  document.getElementById('amount').value='';
}

function addTransaction(desc, amount, type='expense', category='Other'){
  if(!desc || !amount || isNaN(amount)) return alert('Enter valid description and amount');
  transactions.push({desc, amount, type, category, date:new Date().toISOString()});
  saveData();
  renderTransactions();
  renderCharts();
  checkBudget(category);
}

// ====== QUICK ADD ======
function quickAdd(category){
  const amount=parseFloat(prompt(`Enter amount for ${category}:`));
  if(!amount || isNaN(amount)) return;
  addTransaction(category, amount, 'expense', category);
}

// ====== TRANSACTIONS ======
function renderTransactions(){
  const search=document.getElementById('search')?.value.toLowerCase()||'';
  const list=document.getElementById('transaction-list');
  if(!list) return;
  list.innerHTML='';
  
  transactions.filter(t=>t.desc.toLowerCase().includes(search)||t.category.toLowerCase().includes(search))
  .forEach((t,index)=>{
    const div=document.createElement('div');
    div.className='transaction-item';
    div.innerHTML=`
      <span>${t.desc} (${t.category})</span>
      <span>${t.type==='expense'?'-':'+'}$${t.amount.toFixed(2)}</span>
      <button onclick="deleteTransaction(${index})" style="background:red;color:white;border:none;border-radius:4px;padding:0 5px;cursor:pointer;">x</button>
    `;
    list.appendChild(div);
    addSwipeEvents(div,index);
  });
  
  updateStreak();
}

function deleteTransaction(index){
  const divs = document.querySelectorAll('.transaction-item');
  const div = divs[index];
  if(div){
    div.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    div.style.transform = 'translateX(-100%)';
    div.style.opacity = '0';
    setTimeout(()=>{
      transactions.splice(index,1);
      saveData();
      renderTransactions();
      renderCharts();
      updateStreak();
    },300);
  }
}

// ====== SWIPE-TO-DELETE ======
let startX=0;
function addSwipeEvents(el,index){
  el.addEventListener('touchstart', e => startX = e.touches[0].clientX);
  el.addEventListener('touchend', e => {
    let endX = e.changedTouches[0].clientX;
    if(startX - endX > 50 || endX - startX > 50){
      deleteTransaction(index);
    }
  });
}

// ====== CHARTS ======
function renderCharts(){
  const ctxBar=document.getElementById('barChart')?.getContext('2d');
  const ctxPie=document.getElementById('pieChart')?.getContext('2d');
  if(!ctxBar||!ctxPie) return;

  // Daily balance
  const dailyTotals={};
  transactions.forEach(t=>{
    const day=t.date.split('T')[0];
    dailyTotals[day]=(dailyTotals[day]||0)+(t.type==='income'?t.amount:-t.amount);
  });
  const barData={ labels:Object.keys(dailyTotals), datasets:[{label:'Daily Balance', data:Object.values(dailyTotals), backgroundColor:'#4a90e2'}] };

  // Pie chart (category expenses)
  const categories=[...new Set(transactions.map(t=>t.category))];
  const categorySums=categories.map(c=>transactions.filter(t=>t.category===c).reduce((sum,t)=>t.type==='expense'?sum+t.amount:sum,0));
  const pieData={ labels:categories, datasets:[{label:'Category Expenses', data:categorySums, backgroundColor:categories.map(()=>'#'+Math.floor(Math.random()*16777215).toString(16))}] };

  if(window.barChart) window.barChart.destroy();
  if(window.pieChart) window.pieChart.destroy();
  window.barChart=new Chart(ctxBar,{type:'bar',data:barData,options:{animation:{duration:800,easing:'easeOutQuart'}}});
  window.pieChart=new Chart(ctxPie,{type:'pie',data:pieData,options:{animation:{duration:1000,easing:'easeOutBounce'}}});

  // Update total balance
  const total=document.getElementById('totalBalance');
  if(total) total.textContent=transactions.reduce((sum,t)=>t.type==='income'?sum+t.amount:sum-t.amount,0).toFixed(2);
}

// ====== BUDGETS ======
function setBudget(){
  const limit=parseFloat(document.getElementById('budgetLimit').value);
  const category=document.getElementById('budgetCategory').value;
  if(!limit||isNaN(limit)) return alert('Enter valid limit');
  budgets[category]=limit;
  saveData();
  alert(`Budget for ${category} set to $${limit}`);
  checkAllBudgets();
}

function checkBudget(category){
  if(!budgets[category]) return;
  const spent=transactions.filter(t=>t.type==='expense'&&t.category===category).reduce((sum,t)=>sum+t.amount,0);
  if(spent>budgets[category]) alert(`⚠️ Warning: ${category} spending $${spent} exceeds limit $${budgets[category]}!`);
}

function checkAllBudgets(){ Object.keys(budgets).forEach(c=>checkBudget(c)); }

// ====== STREAK ======
function updateStreak(){
  if(transactions.length===0){
    const streakDisplay=document.getElementById('streakDisplay');
    if(streakDisplay) streakDisplay.textContent=`🔥 Logging Streak: 0 days`;
    return;
  }
  transactions.sort((a,b)=> new Date(a.date)-new Date(b.date));
  const today=new Date();
  let streak=0;
  for(let i=transactions.length-1;i>=0;i--){
    const tDate=new Date(transactions[i].date);
    const diffDays=Math.floor((today-tDate)/(1000*60*60*24));
    if(diffDays===streak) streak++;
    else break;
  }
  const streakDisplay=document.getElementById('streakDisplay');
  if(streakDisplay) streakDisplay.textContent=`🔥 Logging Streak: ${streak} day${streak>1?'s':''}`;
}

// ====== SETTINGS ======
function toggleDarkMode(){ document.body.classList.toggle('dark-mode'); }

function exportCSV(){
  if(transactions.length===0) return alert('No transactions to export');
  let csv='Description,Amount,Type,Category,Date\n';
  transactions.forEach(t=>{ csv+=`${t.desc},${t.amount},${t.type},${t.category},${t.date}\n`; });
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='transactions.csv'; a.click();
  URL.revokeObjectURL(url);
}

function clearAll(){
  if(confirm('Clear all data?')){
    transactions=[];
    budgets={};
    saveData();
    renderTransactions();
    renderCharts();
    updateStreak();
    alert('All data cleared');
  }
}

// ====== INIT ======
renderTransactions();
renderCharts();
updateStreak();