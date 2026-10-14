const $ = id => document.getElementById(id);
let currentUser = null;
const toast = msg => { $("toast").textContent = msg; $("toast").classList.add("show"); setTimeout(()=>$("toast").classList.remove("show"),2800); };

async function api(url, options={}) {
  const res = await fetch(url, {headers: {"Content-Type":"application/json"}, ...options});
  const data = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

async function loadSession(){
  const data = await api("/api/session");
  currentUser = data.user;
  $("loginBtn").classList.toggle("hidden", !!currentUser);
  $("registerBtn").classList.toggle("hidden", !!currentUser);
  $("logoutBtn").classList.toggle("hidden", !currentUser);
  $("dashboardLocked").classList.toggle("hidden", !!currentUser);
  $("dashboardContent").classList.toggle("hidden", !currentUser);
  $("admin").classList.toggle("hidden", !currentUser || currentUser.role !== "admin");
  document.querySelectorAll(".admin-only").forEach(x=>x.classList.toggle("hidden", !currentUser || currentUser.role !== "admin"));
  if(currentUser) loadDashboard();
}

function openModal(id){ $(id).classList.remove("hidden"); }
function closeModal(id){ $(id).classList.add("hidden"); }

document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$("loginBtn").onclick=()=>{ $("loginPanel").classList.remove("hidden"); $("registerPanel").classList.add("hidden"); openModal("authModal"); };
$("registerBtn").onclick=()=>{ $("loginPanel").classList.add("hidden"); $("registerPanel").classList.remove("hidden"); openModal("authModal"); };
$("showRegister").onclick=()=>{ $("loginPanel").classList.add("hidden"); $("registerPanel").classList.remove("hidden"); };
$("showLogin").onclick=()=>{ $("registerPanel").classList.add("hidden"); $("loginPanel").classList.remove("hidden"); };
$("logoutBtn").onclick=async()=>{ await api("/api/logout",{method:"POST"}); currentUser=null; toast("Logged out successfully."); await loadSession(); location.hash="home"; };

$("menuBtn").onclick=()=>document.querySelector(".topbar nav").classList.toggle("open");

$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  try{ await api("/api/login",{method:"POST",body:JSON.stringify({email:$("loginEmail").value,password:$("loginPassword").value})}); closeModal("authModal"); e.target.reset(); toast("Login successful."); await loadSession(); location.hash="dashboard"; }catch(err){toast(err.message);}
};

$("registerForm").onsubmit=async e=>{
  e.preventDefault();
  try{ await api("/api/register",{method:"POST",body:JSON.stringify({name:$("regName").value,email:$("regEmail").value,password:$("regPassword").value})}); closeModal("authModal"); e.target.reset(); toast("Account created successfully."); await loadSession(); location.hash="dashboard"; }catch(err){toast(err.message);}
};

async function loadDestinations(){
  const params=new URLSearchParams({q:$("destinationSearch").value,category:$("categoryFilter").value,sort:$("sortFilter").value});
  const data=await api("/api/destinations?"+params);
  $("destinationGrid").innerHTML=data.map(d=>`
    <article class="card">
      <div class="card-img" style="background-image:url('${d.image}')"></div>
      <div class="card-body"><span class="tag">${d.category}</span><h3>${d.name}</h3><p class="muted">📍 ${d.location}</p><p class="muted">${d.description}</p>
      <div class="price">₹${Number(d.price).toLocaleString("en-IN")} <small>starting price</small></div>
      <div class="card-actions"><button class="primary" onclick="browsePackage('${d.name}')">Find Packages</button></div></div>
    </article>`).join("") || `<div class="notice">No destinations found.</div>`;
}
["destinationSearch","categoryFilter","sortFilter"].forEach(id=>$(id).addEventListener("input",loadDestinations));

async function loadPackages(){
  const params=new URLSearchParams({q:$("packageSearch").value,type:$("packageType").value});
  const data=await api("/api/packages?"+params);
  $("packageGrid").innerHTML=data.map(p=>`
    <article class="card"><div class="card-body"><span class="tag">${p.type}</span><h3>${p.title}</h3><p class="muted">📍 ${p.destination} • ${p.days} days</p><p class="muted">${p.description}</p>
    <div class="price">₹${Number(p.price).toLocaleString("en-IN")} <small>per person</small></div>
    <div class="card-actions"><button class="primary" onclick="bookPackage(${p.id},'${p.title.replace(/'/g,"\\'")}')">Book Now</button></div></div></article>`).join("");
}
["packageSearch","packageType"].forEach(id=>$(id).addEventListener("input",loadPackages));

function browsePackage(name){ $("packageSearch").value=name; loadPackages(); location.hash="packages"; }
function bookPackage(id,title){
  if(!currentUser){toast("Please login to book a package."); $("loginBtn").click(); return;}
  $("bookingPackageId").value=id; $("bookingTitle").textContent=title; $("bookingDate").min=new Date().toISOString().split("T")[0]; openModal("bookingModal");
}
$("bookingForm").onsubmit=async e=>{
  e.preventDefault();
  try{ await api("/api/bookings",{method:"POST",body:JSON.stringify({packageId:$("bookingPackageId").value,date:$("bookingDate").value,guests:$("bookingGuests").value})}); closeModal("bookingModal"); e.target.reset(); toast("Booking confirmed."); loadDashboard(); location.hash="dashboard"; }catch(err){toast(err.message);}
};

async function loadDashboard(){
  if(!currentUser)return;
  const [stats, bookings]=await Promise.all([api("/api/stats"),api("/api/bookings")]);
  $("stats").innerHTML=[
    ["🌍",stats.destinations,"Destinations"],["🧳",stats.packages,"Packages"],["📅",stats.bookings,"Bookings"],["💰","₹"+Number(stats.revenue).toLocaleString("en-IN"),"Booking Value"]
  ].map(s=>`<div class="stat"><span>${s[0]}</span><b>${s[1]}</b><span>${s[2]}</span></div>`).join("");
  $("bookingsTable").innerHTML=bookings.length?bookings.map(b=>`<div class="booking"><div><b>${b.package}</b><div class="muted">${b.date} • ${b.guests} guest(s) • ₹${Number(b.total).toLocaleString("en-IN")}</div></div><div><span class="status ${b.status==="Cancelled"?"cancel":""}">${b.status}</span>${b.status!=="Cancelled"?`<button class="ghost" onclick="cancelBooking(${b.id})">Cancel</button>`:""}</div></div>`).join(""):`<div class="notice">No bookings yet. Explore our packages.</div>`;
}
$("refreshDashboard").onclick=loadDashboard;
async function cancelBooking(id){if(!confirm("Cancel this booking?"))return;try{await api("/api/bookings/"+id+"/cancel",{method:"PUT"});toast("Booking cancelled.");loadDashboard()}catch(e){toast(e.message)}}

async function loadReviews(){
  const data=await api("/api/reviews");
  $("reviewGrid").innerHTML=data.map(r=>`<article class="review"><div class="stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div><b>${r.name}</b><div class="muted">${r.destination}</div><p>“${r.comment}”</p></article>`).join("");
}
$("reviewBtn").onclick=()=>{if(!currentUser){toast("Please login to write a review.");$("loginBtn").click();return;}openModal("reviewModal")};
$("reviewAction").onclick=()=>$("reviewBtn").click();
$("reviewForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/reviews",{method:"POST",body:JSON.stringify({destination:$("reviewDestination").value,rating:$("reviewRating").value,comment:$("reviewComment").value})});closeModal("reviewModal");e.target.reset();toast("Review submitted.");loadReviews()}catch(err){toast(err.message)}};

$("contactForm").onsubmit=e=>{e.preventDefault();toast("Thank you! Your enquiry has been submitted.");e.target.reset();};

$("adminAction").onclick=()=>location.hash="admin";

async function loadAdmin(){
  if(!currentUser || currentUser.role!=="admin")return;
  const [d,p]=await Promise.all([api("/api/destinations"),api("/api/packages")]);
  $("adminRecords").innerHTML=`<h4>Destinations</h4>`+d.map(x=>`<div class="record"><span><b>${x.name}</b> — ${x.category} — ₹${x.price}</span><span class="record-actions"><button onclick="editDestination(${x.id})">Edit</button><button class="danger" onclick="deleteDestination(${x.id})">Delete</button></span></div>`).join("")+
  `<br><h4>Packages</h4>`+p.map(x=>`<div class="record"><span><b>${x.title}</b> — ${x.destination} — ₹${x.price}</span><span class="record-actions"><button onclick="editPackage(${x.id})">Edit</button><button class="danger" onclick="deletePackage(${x.id})">Delete</button></span></div>`).join("");
}
async function editDestination(id){const d=(await api("/api/destinations")).find(x=>x.id===id);$("destinationId").value=d.id;$("dName").value=d.name;$("dCategory").value=d.category;$("dLocation").value=d.location;$("dPrice").value=d.price;$("dImage").value=d.image;$("dDescription").value=d.description;location.hash="admin";}
async function deleteDestination(id){if(!confirm("Delete destination?"))return;try{await api("/api/destinations/"+id,{method:"DELETE"});toast("Destination deleted.");loadAdmin();loadDestinations()}catch(e){toast(e.message)}}
$("destinationForm").onsubmit=async e=>{e.preventDefault();const id=$("destinationId").value;const body={name:$("dName").value,category:$("dCategory").value,location:$("dLocation").value,price:$("dPrice").value,image:$("dImage").value,description:$("dDescription").value};try{await api(id?"/api/destinations/"+id:"/api/destinations",{method:id?"PUT":"POST",body:JSON.stringify(body)});toast(id?"Destination updated.":"Destination added.");e.target.reset();$("destinationId").value="";loadAdmin();loadDestinations()}catch(err){toast(err.message)}};
$("clearDestination").onclick=()=>{$("destinationForm").reset();$("destinationId").value=""};

async function editPackage(id){const p=(await api("/api/packages")).find(x=>x.id===id);$("packageId").value=p.id;$("pTitle").value=p.title;$("pDestination").value=p.destination;$("pDays").value=p.days;$("pPrice").value=p.price;$("pType").value=p.type;$("pDescription").value=p.description;location.hash="admin";}
async function deletePackage(id){if(!confirm("Delete package?"))return;try{await api("/api/packages/"+id,{method:"DELETE"});toast("Package deleted.");loadAdmin();loadPackages()}catch(e){toast(e.message)}}
$("packageForm").onsubmit=async e=>{e.preventDefault();const id=$("packageId").value;const body={title:$("pTitle").value,destination:$("pDestination").value,days:$("pDays").value,price:$("pPrice").value,type:$("pType").value,description:$("pDescription").value};try{await api(id?"/api/packages/"+id:"/api/packages",{method:id?"PUT":"POST",body:JSON.stringify(body)});toast(id?"Package updated.":"Package added.");e.target.reset();$("packageId").value="";loadAdmin();loadPackages()}catch(err){toast(err.message)}};
$("clearPackage").onclick=()=>{$("packageForm").reset();$("packageId").value=""};

window.addEventListener("hashchange",()=>{if(location.hash==="#admin")loadAdmin()});
(async()=>{await loadSession();await loadDestinations();await loadPackages();await loadReviews()})();
