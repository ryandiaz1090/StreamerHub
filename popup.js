window.onload = function() {
    const BASE_URL_TWITCH = "https://api.twitch.tv/helix/streams?user_login=";


    //Our API Key/client id for twitch.tv
    const CLIENT_ID_TWITCH = "wn4jubf3xbpbk49l089pb1p429qlce";

    //An example API call to mixer getting specific channel information
    const BASE_URL_MIXER = "https://mixer.com/api/v1/channels/";

    // An API to get user follow
    const GET_URL_FOLLOW = "https://api.twitch.tv/kraken/users/<user ID>/follows/channels";

    //Get the button to add streamer, and run streamSelected() on click
    const addStreamButton = document.getElementById("addStreamButton");
    addStreamButton.addEventListener('click', streamSelected);

    //let streamersArray = [ { status : '', username : '', viewers : 0 } ];
    let streamersArray = [ ];

    function streamSelected() {
        let ele = document.getElementsByName('website');

        for (i = 0; i < ele.length; i++) {
            if (ele[i].checked) {
                switch (ele[i].value) {
                    case "twitch":
                        getStreamerTwitch();
                        return;
                    case "mixer":
                        getStreamerMixer();
                        return;
                }
            }
        }
    }

    //Function to get streamer data from Twitch's API
    /* Twitch seems to require that the client-id be in the Javascript Header Object, more info on those:
       https://developer.mozilla.org/en-US/docs/Web/API/Headers
       https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch */
    async function getStreamerTwitch() {
        const user = document.querySelector("#streamId").value;
        console.log("Calling twitch api for user: " + user);

        fetch(BASE_URL_TWITCH + user, {
            method: 'GET', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
                'Client-ID': CLIENT_ID_TWITCH,
            },
        })
            .then((response) => response.json())
            .then((user) => {
                console.log('Success:', user);

                //Placing JSON array object into obj for better readability later
                const obj = user.data[0];
                if (obj === undefined) {
                    console.log("Offline");
                } else {
                    addStreamer(obj.type, obj.user_name, obj.viewer_count);
                }
            })
    }

    //Function to get streamer data from Mixer's API
    async function getStreamerMixer() {
        const user = document.querySelector("#streamId").value;
        console.log("Calling mixer api for user: " + user);

        fetch(BASE_URL_MIXER + user, {
            method: 'GET', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then((response) => response.json())
            .then((user) => {
                //console.log('Success:', user);

                //User is already a parsed JSON object, can access data directly and check if user.online === true
                if (user.online === true) {
                    addStreamer(user.online, user.token, user.viewersCurrent);
                    chrome.storage.local.get(function(result) {
                        if (Object.keys(result).length > 0 && result.streamersArray) {
                            // The streamer array already exists, add to it the status, username, and viewers
                            console.log("we are in the first if...");
                            result.streamersArray = [{ status: user.online, username: user.token, viewers : user.viewersCurrent }];
                            //result.streamersArray.push({status: status, username: user.token, viewers: user.viewersCurrent});

                        } else {
                            // The data array doesn't exist yet, create it
                            console.log("we are in the else...");
                            result.streamersArray = [{ status: user.online, username: user.token, viewers : user.viewersCurrent }];
                        }

                        // Now save the updated items using set
                        chrome.storage.sync.set({streamersArray:{}}, function() {
                            console.log(result);
                            console.log('Data successfully saved to the storage!');
                        });

                        //console.log(result.streamersArray);
                    });
                    //Add streamer to local storage using chrome.storage
                    //chrome.storage.local.set({streamersArray:{status: user.online, username: user.token, viewers:user.viewersCurrent}}, function() {
                    //    console.log(" Added to storage.sync...\n");
                    //});

                } else
                    console.log("Offline");
            })
    }

    function addStreamer(status, username, viewers) {
        let tableRef = document.getElementById("onlineStreamersTable");
        let row = tableRef.insertRow(1);
        let statusCell = row.insertCell(0);
        let rowCell = row.insertCell(1);
        let viewerCell = row.insertCell(2);
        statusCell.innerHTML = status;
        rowCell.innerHTML = username;
        viewerCell.innerHTML = viewers;

        //streamersArray.push({status: status, username: username, viewers: viewers});

    }

    //Function to test if properly storing streamer data
    const show = document.getElementById("showButton");
    show.addEventListener('click', showStreamers);

    function showStreamers() {
        //console.log("Showing streamers in local array...\n");
        //console.log(streamersArray);

        //console.log("Showing streamers in storage array...\n");
        chrome.storage.local.get(function(result) {
            console.log(result);
        });


    }

    //Function to test if properly storing streamer data
    const clear = document.getElementById("clearButton");
    clear.addEventListener('click', clearStreamers);

    function clearStreamers() {

    }

    function getFollowers(name) {
        return new Promise((resolve, reject) => {
            request({GET_URL_FOLLOW, json: true}, (err, resp, body) => {
                if (err == true) {
                    reject(err)
                }

                const PEOPLE_FOLLOWERS = body.follows.map(follower => {
                    return {id: follower.user.id, name: follower.user.name}
                })
                resolve(PEOPLE_FOLLOWERS)
            })
        })

    }

}