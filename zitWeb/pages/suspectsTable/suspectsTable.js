

function addSuspect() {
  const text = `
    <div id="background">
      <label for="nameI">
        name: <input id="nameI" type="text">
      </label><br>
      <label for="peleI">
        pele number: <input id="peleI" type="text">
      </label><br>
      <label for="imageI">
        image: <input id="imageI" type="file">
      </label><br>
      <label for="lastSeenI">
        last seen: <input id="lastSeenI" type="date">
      </label><br>
    </div>
  `;

  const elem = document.createElement("div");
  elem.className = "addSusPage";
  elem.innerHTML = text;

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.textContent = "×";


  const bgContainer = elem.querySelector("#background");
  bgContainer.appendChild(closeBtn);


  document.body.appendChild(elem);


  closeBtn.addEventListener("click", () => elem.remove());
  elem.addEventListener("click", e => {
    if (e.target === elem) {
      elem.remove();
    }
  });
}

document.getElementById("addS").addEventListener("click",addSuspect);