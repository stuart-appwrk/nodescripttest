(function siteApp() {

    const siteSelect = document.querySelector('#site');
    const envList = document.querySelector('#environment');
    if (!siteSelect) return;

    siteSelect.onchange = handleChange;

    async function handleChange(e) {
        const siteId = this.value;
        const enviroments = await fetchEnviroments(siteId);
        renderEnviroments(enviroments)
    }

    async function fetchEnviroments(siteId) {
        const endpoint = `/environment/${siteId}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        return data;
    }

    function renderEnviroments(data) {
        const enviromentHTML = data.map(env => `<option value='${env.id}'>${env.name}</option>`).join();
        envList.innerHTML += enviromentHTML;
        if (!enviromentHTML) {
            alert("Environments are not set with respect to selected site!")
        }
    }

})()