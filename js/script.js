const app = new PIXI.Application({ // create the app
    forceCanvas: true,
    antialias: true, 
    transparent: false, 
    backgroundColor: 0xffffff,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
});

const resources = PIXI.Loader.shared.resources; // pixi references (save on typing)

const Sprite = PIXI.Sprite;

const loader = PIXI.Loader.shared;

const roomSelector = document.getElementById('roomSelector'); // dom references

const maincontainer = document.getElementById('maincontainer');

const roomLabel = document.getElementById('room');

const containers={ // easier to itterate through 
    growth : new ContainerObject('growth','GROWTH'),//data for aggregate containers
    exits : new ContainerObject('exit','EXITS'),
    bathrooms : new ContainerObject('bath','BATHROOMS'),
    coffee : new ContainerObject('coffee','COFFEE MAKERS')
};

const buildOptionString = (value,option) => '<option value=' + value+'>'+option + '</option>';

const buildURLString = (roomID) => {
    let urlString = window.location.href.split('?')[0]+'?id='+roomID;
    window.history.pushState({}, null, urlString);
    return urlString;
};

const clearAggregateContainers = () => {
    for (let container in containers){
        containers[container].pixiContainer.alpha=0;
    }
};

const checkURL =() => { // see if URL has parameters
    if (getQueryVariable('id')){
        doTheRoomThing(getQueryVariable('id'));
    } else if (getQueryVariable('search')){
        doTheRoomThing(getRoomID(getQueryVariable('search')));
    }
};

const toggleLegend = () => { 
    (legendlayer.alpha===0) ? legendlayer.alpha=1 : legendlayer.alpha=0;
};

const getCSVData =async () => { //hack get data from CSV file
    // let responseJson ={};
    // let resultJson = {};

    // let response = await fetch('http://localhost:3000/points/');

    // if (response.ok) {
    //     responseJson = await response.json();
    // }else {
    //     console.log('HTTP Error:' + response.status);
    // }
    // let firstOption= { 
    //                     'name': 'Room or Person',
    //                     'x': 0,
    //                     'y': 0,
    //                     'capacity': 0,
    //                     'zoom': '',
    //                     'floor': 'First Floor',
    //                     'id': '1'
    //                 };
    // resultJson['']=firstOption;
    // for (let key in responseJson){
    //     let newObj = {
    //         'name':responseJson[key].name,
    //         'x': responseJson[key].x,
    //         'y': responseJson[key].y,
    //         'capacity': responseJson[key].capacity,
    //         'zoom': responseJson[key].zoom,
    //         'floor': responseJson[key].floor,
    //         'id': responseJson[key]._id
    //     };
    //     resultJson[responseJson[key].tag] = newObj;                  
    // }
    // console.log(resultJson);
    // populateRooms(resultJson);
    // var myInput = $('.combobox.form-control');//find the input box
    // myInput[0].focus();// focus on the input box
    // populateAggregateContainers();


    $(document).ready(function(){
        $.ajax({
            url:'./data21-08-2020.csv',
            dataType:'text',
            success:function(data) { // hack CSV to hashed JSON, won't handle funcky CSV. consider implementing proper library!!!
                let lines = data.split('\r\n');
                let result = {};
                let headers = lines[0].split(',');
                let firstOption= { 
                    'name': 'Room or Person',
                    'x': 0,
                    'y': 0,
                    'capacity': 0,
                    'zoom': '',
                    'floor': 'First Floor',
                    'id': '1'
                };
                result[''] = firstOption; //first entry blank hash, this is needed for the dropdown default value

                for(let i=1;i<lines.length;i++){ // skip the colum headers, go through all the lines
                    let obj = {};
                    let currentline = lines[i].split(',');
                    let currentKey = currentline[0].trim(); // get the key for hash
                    for(let j=1;j<headers.length;j++){ // go through all the values in line
                        obj[headers[j]] = currentline[j].trim();
                    }
                    result[currentKey]=obj;
                }
            populateRooms(result);
            var myInput = $('.combobox.form-control');//find the input box
            myInput[0].focus();// focus on the input box
            populateAggregateContainers();
            }
        });
    });
};

const setup = () =>{ // setup does the dropdown on change and renders stuff
    getCSVData();
    setupRenderer();
    renderAssets();
    clearAggregateContainers();
    roomSelector.onchange = roomSelected;
};

const getQueryVariable = (variable) =>{ // return the value
    let query = window.location.search.substring(1);
    let vars = query.split("&");
    for (let i=0;i<vars.length;i++) {
            let pair = vars[i].split("=");
            if(pair[0] == variable) return pair[1];
    }
    return(false);
};

const getRoomID = (roomName) =>{ // get the ID from the name
    let keys = Object.keys(pinPoints); // get all the keys, which are IDs
    for (let key = 1; key < keys.length; key++){ 
        if (pinPoints[keys[key]].name.toLowerCase().includes(roomName.toLowerCase())){ //go through each key and check if the name includes search paramter
            return keys[key]; // return ID
        } else clearSelection();
    }
};

const zoom =(value) =>{
    zoomScale+=value;
    if (zoomScale<0.2) zoomScale = 0.2;
    if (zoomScale>=0.2){
        zoomScale=Math.round( zoomScale * 10 ) / 10;
        doTheZoom(zoomScale);
    }
};

const doTheZoom = (value) =>{
    fullmap.scale.set(value);
    if (selectedRoom!=null&&selectedRoom!=''){
        movePointer(selectedRoom.x,selectedRoom.y);
        if (selectedRoom.floor==='Second Floor'){
            secondFloor.alpha=1;
        }else {
            secondFloor.alpha=0;
        }
    }else {
        fullmap.pivot.set(2048,2048); // set the pivot of the map at the coordinates
        centerMap();
    }
};

const centerMap = () =>{
    app.stage.pivot.x = fullmap.position.x;
    app.stage.pivot.y = fullmap.position.y;
    let winW = $(window).width(); // find better way to get the damn window W/H check with a UI dev!!!
    let winH = $(window).height();
    app.stage.position.x = winW/2; //set the stage to center point
    app.stage.position.y = winH/2; //set the stage to center point
};

const doTheRoomThing = (roomID) => {
    clearSelection(); // since room is selected clear everything
    buildURLString(roomID); //change the URL to this room's ID
    let isContainer = false; //not a container wtf is this here for? this logic sux, refactor
    for (let container in containers){//go through containers to see if one has been selected 
        if(roomID===containers[container].selectionValue){
            containers[container].pixiContainer.alpha=1;
            isContainer=true;
            break;
        }
    }
    if(!isContainer){
        selectedRoom=pinPoints[roomID];
        let zoomID = selectedRoom.zoom;
        if (zoomID!='' && zoomID!=null && zoomID!='person'){ // if zoom ID exists create zoom link
            createRoomLinks(zoomID);
        }else if(zoomID==='person'){
            roomLabel.style.display = 'none';
        }else{
            roomLabel.textContent = ' No Zoom ';
            roomLabel.style.display = 'block';
        }
        movePointer(selectedRoom.x,selectedRoom.y);
        if (selectedRoom.floor==='Second Floor') secondFloor.alpha=1;
    }
};

const clearSelection = () => {
    let urlString = window.location.href.split('?')[0]; // to clean the URL get everything before ?
    window.history.pushState({}, null, urlString); // push to that
    selectedRoom=null; // remove room
    roomLabel.textContent =''; //make label invisible
    roomLabel.style.display = 'none';
    pin.alpha=0;     //make pointer invisible
    pointer.alpha=0;
    clearAggregateContainers(); //clear the containers for multiple points
    secondFloor.alpha=0;     //remove second floor
};

const createRoomLinks = (zoomID) => { // create the html 
    let phoneLink = createLink('tel:16475580588,,'+zoomID+'#,#','images/callphoneicon.png','50px');
    let zoomLink = createLink('https://zoom.us/j/'+zoomID,'images/callzoomicon.png','50px');
    roomLabel.textContent = ' '+zoomID+' ';
    roomLabel.insertBefore(phoneLink, roomLabel.firstChild);
    roomLabel.appendChild(zoomLink); // append to the message 
    roomLabel.style.display = 'block';
};

const createLink = (_href,_src,_height,_zoomID) => { //html fuckery 
    let link = document.createElement('a');
    let icon = document.createElement('img');
    link.href = _href +_zoomID;
    icon.src=_src;
    icon.style.height=_height;
    link.appendChild(icon); 
    return link;
};

const renderAssets = () => { // do the map stuff
    fullmap = new Sprite(resources['images/cleanmap.png'].texture);
    roomnames = new Sprite(resources['images/roomnames.png'].texture);
    setupMap();
    setupPointer();
    app.stage.addChild(fullmap);
    fullmap.addChild(roomnames);
    fullmap.addChild(legendlayer);
    fullmap.addChild(secondFloor);
    fullmap.addChild(pointer);
    fullmap.addChild(pin);
    for (let container in containers){
        fullmap.addChild(containers[container].pixiContainer);
    }
    fullmap.pivot.set(2048,2084);
    centerMap();
};

const movePointer = (_x,_y) => { // move pointer to x,y from json
    pin.alpha=1;
    pointer.alpha=1;
    blinkCount=3;
    pointer.position.set(_x-30,_y);
    pin.position.set(_x,_y);
    fullmap.pivot.set(_x,_y); // set the pivot of the map at the coordinates
    centerMap();
};

const setupRenderer = () => {
    app.renderer.view.style.position = 'absolute';
    app.renderer.view.style.display = 'block';
    app.renderer.autoDensity = true;
    app.renderer.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', function(){ 
        app.renderer.resize(window.innerWidth, window.innerHeight);
    });
};

const setupCursor = () => {
    app.renderer.plugins.interaction.cursorStyles.default = 'url("images/newcursor.png"),auto';
    app.renderer.plugins.interaction.cursorStyles.hover = 'url("images/newcursor.png"),auto';
};

const setupMap = () => {
    // addToContainer();
    fullmap.scale.set(zoomScale);
    fullmap.pivot.set(0,0);
    fullmap.interactive=true;
    fullmap
        .on('pointerdown', onDragStart)
        .on('pointerup', onDragEnd)
        .on('pointerupoutside', onDragEnd)
        .on('pointermove', onDragMove)
        .on('touchstart', onDragStart)
        .on('touchend', onDragEnd)
        .on('touchendoutside', onDragEnd)
        .on('touchmove', onDragMove);
};

const setupPointer = () => {
    pointer = new Sprite(resources['images/newpointer.png'].texture);
    pin = new Sprite(resources['images/pin.png'].texture);
    secondFloor = new Sprite(resources['images/newsecondfloor.png'].texture);
    legendlayer = new Sprite(resources['images/legendlayer.png'].texture);
    secondFloor.position.set(2434,3572);
    secondFloor.alpha=0;
    pin.anchor.set(0.5,1);
    pin.scale.set(2);
    pointer.anchor.set(1,0.2);
    pointer.scale.set(2);
    pin.alpha = 0;
    pointer.alpha = 0;
};

const loadAssets = () => {
    loader.add(['images/newpointer.png','images/pin.png','images/newsecondfloor.png','images/cleanmap.png','images/roomnames.png','images/legendlayer.png']);
    loader.load(setup);
};

const populateRooms = (result) => {
    let selections;
    for(let key in result){ // go through all the keys
        let isContainer = false;
        let nameString = result[key].name;
        let coorsObj = {};
        coorsObj['x'] = result[key].x;
        coorsObj['y'] = result[key].y;
        for (let container in containers){//for every container 
            if (nameString.toLowerCase().includes(containers[container].selectionValue)){ //if the name has the value in it
                containers[container].data[key]=coorsObj; // add the coordinates to that container's data
                isContainer=true; //indicate that this is a container so it's not double added
                break; //exit for loop
            }
        }
       if(!isContainer) { // if the value is not a container, build an option for it in the dropdown
            if (result[key].capacity>0)
                selections += buildOptionString(key, result[key].capacity+'-'+nameString);
            else
                selections += buildOptionString(key, nameString);
        }
    }
    for (let container in containers){
        selections += buildOptionString(containers[container].selectionValue,containers[container].selectionName);
    }
    roomSelector.innerHTML = selections;
    $(document).ready(function(){
      $('.combobox').combobox();
    });
    pinPoints = result;
    checkURL();
};

const populateAggregateContainers = () => {
    for (let container in containers){
        for(let key in containers[container].data){
            let aggregatePin = new Sprite(resources['images/pin.png'].texture);
            aggregatePin.position.set(containers[container].data[key].x,containers[container].data[key].y);
            containers[container].pixiContainer.addChild(aggregatePin);
        }
        containers[container].pixiContainer.position.set(-30,-75); // not sure why offset is needed and too lasy to find out
    }
};

let zoomScale = 0.3, // this sets the zoom
secondFloor, pointer, pin, fullmap, roomnames, legendlayer,// sprites.
selectedRoom, // store the selected room 
pinPoints; // actual data for the points

function ContainerObject(value, name){ //container object
    this.pixiContainer = new PIXI.Container();
    this.data = {};
    this.selectionValue = value;
    this.selectionName = name;
}

function roomSelected(){ // yay stuff changed
    if (this.value!=''){ 
        if (this.value!=null){ // had to do this separately because javascript
            doTheRoomThing(this.value);
        }
    }else{ // if nothing is selected clean up
        clearSelection();
    }
}

function onDragStart(event){
    this.data = event.data;
    this.dragging = this.data.getLocalPosition(this.parent);
    $(maincontainer).fadeOut('fast'); // jquery to fade menu out
}

function onDragEnd(){
    this.dragging = false;
    this.data = null;
    $(maincontainer).fadeIn('fast');
}

function onDragMove(){
    if (this.dragging) {
        let newPosition = this.data.getLocalPosition(this.parent);
        this.position.x += (newPosition.x - this.dragging.x);
        this.position.y += (newPosition.y - this.dragging.y);
        this.dragging = newPosition;
    }
}

document.body.appendChild(app.view); // append its view to body
loadAssets(); //load the assets
setupCursor(); //funky cursor