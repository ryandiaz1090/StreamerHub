function addStreamer(status, name, viewers){
    let tableRef = document.getElementById("onlineStreamersTable");
    let row = tableRef.insertRow(1);
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    let cell3 = row.insertCell(2);
    cell1.innerHTML = status;
    cell2.innerHTML = name;
    cell3.innerHTML = viewers;
}