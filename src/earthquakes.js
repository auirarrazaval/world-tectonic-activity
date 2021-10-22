const WIDTH = document.getElementById('earthquakes-container').clientWidth
HEIGHT = WIDTH * 0.6;

const margin = { top: 50, bottom: 0, left: 50, right: 50 };

const width = WIDTH - margin.left - margin.right,
height = HEIGHT - margin.top - margin.bottom;

const svg = d3.select('svg#earthquakes-svg')
                .attr('width', WIDTH)
                .attr('height', HEIGHT);

const map = svg.append('g')
                .attr('id', 'geo-container')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);

const title = svg.append('text')
                .attr('id', 'title')
                .attr('transform', `translate(${margin.left + width / 2}, ${margin.top / 2})`)
                .attr('dy', '0.5em')
                .style('text-anchor', 'middle')
                .text("Mapa Tectónico")

/* 
    Definir los 3 elementos g que contendrán los continentes, placas tectónicas, y terremotos, respectivamente
    los nombraremos: continentGroup, tectonicGroup, earthquakesGroup
*/

const continentGroup = map.append("g").attr("id", "continets")
const tectonicGroup = map.append("g").attr("id", "tecnotic-plates")
const earthquakesGroup = map.append("g").attr("id", "earthquakes")

const boundingRect = map.append("rect")
                        .attr("id", "boudaries")
                        .attr("width", width)
                        .attr("height", height)
                        .attr("fill", "none")
                        .attr("stroke", "black")

/* 
    Definir y aplicar el ClipPath
    ¿A que se le aplica el clipPath? ¿Todo el SVG? ¿Algún grupo de elementos?
*/

const clipPath = map.append("clipPath")
                    .attr("id", "mapClip")
                    .append("rect")
                        .attr("width", width)
                        .attr("height", height)

map.attr("clip-path", "url(#mapClip)")


// Acá se buscan en el documento todos los elementos de input que definimos en el HTML

const togglePlates = document.getElementById("toggle-plates");
const toggleContinents = document.getElementById("toggle-continents");
const toggleQuakes = document.getElementById("toggle-earthquakes");

const fromDate = document.getElementById("from-date");
const toDate = document.getElementById("to-date");

const magnitudeRange = document.getElementById("magnitude-range");
const magnitudeLabel = document.getElementById("rangeValue");

const fetchButton = document.getElementById("fetch-earthquakes");

/*
    Definir que pasa cada vez que se cambia un valor en mis inputs
*/

magnitudeRange.onchange = () => {
    magnitudeLabel.innerHTML = magnitudeRange.value;
};

togglePlates.onchange = () => {
    tectonicGroup
        .attr("opacity", togglePlates.checked ? 0: 1)
        .transition()
            .duration(500)
            .attr("opacity", togglePlates.checked ? 1: 0)
            .end()
            .style("display", togglePlates.checked ? "block": "none")
}

toggleContinents.onchange = () => {
    continentGroup
        .attr("opacity", toggleContinents.checked ? 0: 1)
        .transition()
            .duration(500)
            .attr("opacity", toggleContinents.checked ? 1: 0)
            .end()
            .style("display", toggleContinents.checked ? "block": "none")
}

toggleQuakes.onchange = () => {
    earthquakesGroup
        .attr("opacity", toggleQuakes.checked ? 0: 1)
        .transition()
            .duration(500)
            .attr("opacity", toggleQuakes.checked ? 1: 0)
            .end()
            .style("display", toggleQuakes.checked ? "block": "none")
}

// La función fetchQuakes hace una request a la API de terremotos del gobierno de EEUU, según  ciertos parámetros
// La request retorna un GEOJSON con la información de todos los terremotos

async function fetchQuakes(params) {
    // https://developer.mozilla.org/en-US/docs/Web/API/URL
    const url = new URL("https://earthquake.usgs.gov/fdsnws/event/1/query");
    url.search = new URLSearchParams(params).toString();
    return await d3.json(url);
}

/*

    initialLoad carga todos los datasets que necesitamos para nuestra visualización:
        1. GEOJSON con placas tectónicas
        2. GEOJSON con continentes
        3. fetch de GEOJSON con terremotos durante la última semana (usando la librería luxon para las fechas)

    Podrán notar que hay dos 'keywords' que tal vez nunca habían visto: async y await.
        1. async function es una función ASÍNCRONA que retorna una PROMESA (i.e. te 'promete' que en algún momento te entregará algo)
        2. await se usa para asegurarse de que llegue esa promesa antes de seguir ejecutando el código

    d3.json() es una async function que devuelve una promesa.
    Hasta ahora estabamos usando el método .then((data) => {...}), que es lo mismo a decir que "cuando me devuelvas los datos, entonces haré esto con los datos"
    alternativamente, podemos usar:
    const datos = await d3.json();
    {hacer lo que queramos con los datos}

    Como initialLoad también es una función asíncrona, entonces también podemos usar initialLoad().then((data) => {...})
*/

async function initialLoad() {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await
    const plates = await d3.json('./src/data/tectonic_plates.json');
    const continents = await d3.json('./src/data/continents.json');

    const params = {
        format: "geojson",
        minmagnitude: 0,
        starttime: luxon.DateTime.now().setZone("America/Santiago").minus({ months: 0, weeks: 1, days: 0 }).toISO(),
        endtime: luxon.DateTime.now().setZone("America/Santiago").toISO(),
    }

    fromDate.value = params.starttime.slice(0, -10);
    toDate.value = params.endtime.slice(0, -10);
    magnitudeRange.value = 0;
    magnitudeLabel.innerHTML = 0;

    // console.log(params);

    const earthquakes = await fetchQuakes(params);    

    return {plates, continents, earthquakes};
}

/* 
    Crear el comportamiento de ZOOM restringido al recuadro original, con límites de k [1, 4]
*/

const zoomHandler = (evento) => {
    const transformacion = evento.transform;

    const duration = 200;

    continentGroup.selectAll("path.continent")
        .transition()
            .duration(duration)
            .attr("transform", transformacion);
    tectonicGroup.selectAll("path.tectonic-plate")
        .transition()
            .duration(duration)
            .attr("transform", transformacion);
    earthquakesGroup.selectAll("circle.earthquake")
        .transition()
            .duration(duration)
            .attr("transform", transformacion);
}

const zoom = d3.zoom()
                .extent([ [0, 0], [width, height], ])
                .translateExtent([ [0, 0], [width, height], ])
                .scaleExtent([1, 4])
                .on("zoom", zoomHandler);

map.call(zoom);

// Definir la proyección a usar: geoWinkel3, geoMercator, etc

const proyeccion = d3.geoWinkel3();



const updateQuakes = (earthquakes) => {
    earthquakesGroup.selectAll("circle.earthquake")
        .data(earthquakes.features, (d) => d.properties.code)
        .join(
            (enter) => {
                enter.append("circle")
                        .attr("class", "earthquake")
                        .attr("id", (d) => d.properties.code)
                        .attr("cx", (d) => proyeccion(d.geometry.coordinates)[0])
                        .attr("cy", (d) => proyeccion(d.geometry.coordinates)[1])
                        .transition()
                        .attr("r", (d) => d.properties.mag)
                        .attr("fill", "red")
                        .attr("opacity", 0.1)
                        .attr("stroke", "red");
            },
            (update) => {

            },
            (exit) => {
                exit.transition().attr("r", 0).remove()
            })
}

initialLoad().then(({plates, continents, earthquakes}) => {
    console.log(plates);
    console.log(continents);
    console.log(earthquakes);

    // 'Fittear' la proyección a los datos y crear el generador de caminos

    proyeccion.fitSize([width, height], plates);
    const caminosGeo = d3.geoPath().projection(proyeccion);

    // Agregar continentes al mapa

    continentGroup.selectAll("path.continent")
                    .data(continents.features)
                    .enter()
                    .append("path")
                        .attr("class", "continent")
                        .attr("id", (d) => d.properties.CONTINENT.toLowerCase().replace(" ", "-"))
                        .attr("d", caminosGeo)
                        .attr("darkgreen", "lightgreen")
                        .attr("opacity", 0.1)
                        .attr("darkgreen", "lightgreen");

    // Agregar placas tectónicas al mapa
    
    tectonicGroup.selectAll("circle.tectonic-plate")
                    .data(plates.features)
                    .enter()
                    .append("circle")
                        .attr("class", "tectonic-plate")
                        .attr("id", (d) => d.properties.PlateName.toLowerCase().replace(" ", "-"))
                        .attr("d", caminosGeo)
                        .attr("fill", "blue")
                        .attr("fill-opacity", 0.1)
                        .attr("stroke", "blue")
                        .attr("stroke-width", 1)
                        .attr("stroke-opacity", 0.2)

    // Agregar terremotos al mapa

    updateQuakes(earthquakes);
})


// Crear una función para actualizar los terremotos que se muestran
fetchButton.onclick = () => {
    startDate = luxon.DateTime.fromISO(fromDate.value).setZone("America/Santiago").toISO();
    endDate = luxon.DateTime.fromISO(toDate.value).setZone("America/Santiago").toISO();
    magnitude = parseFloat(magnitudeRange.value);
    const params = {
        format: "geojson",
        minmagnitude: magnitude,
        starttime: startDate,
        endtime: endDate,
    }
    // falta actualziar los terremotos
    fetchQuakes(params).then(updateQuakes);
}