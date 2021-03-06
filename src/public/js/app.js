const socket = io();
socket.connect()
const image = document.getElementById('image');
const video = document.getElementById('video');

const firstUser = document.getElementById('firstUser')
firstUser.innerText = "OTHER"
let myPeerConnections = {};
let myDataChannels = [];

socket.emit("join_room");

socket.on('stream',async (buffer) =>{


  var data = await arrayBufferToBase64(buffer)
  var imageData = "data:image/;base64," + data; 
  image.src =  imageData
  

  if(firstUser.text !== 'firstUser'){
    firstUser.innerText = 'firstUser'
  }

  myDataChannels.forEach((dataChannel) =>{
 
    if(dataChannel.readyState === 'open'){ 
      dataChannel.send(imageData)
    }
    
  })

})


async function arrayBufferToBase64( buffer ) {
	var binary = '';
	var bytes = new Uint8Array( buffer );
	var len = bytes.byteLength;
	for (var i = 0; i < len; i++) {
		binary += String.fromCharCode( bytes[ i ] );
	}
	return window.btoa( binary );
}

function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

// Socket Code
socket.on("welcome", async (users, socketId) => {

  users.forEach(async (user) =>{
   
    const myPeerConnection = await makeConnection(user.id);
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("sent the offer");
    socket.emit("offer", offer, user.id, socket.id);
  })

});

socket.on("offer", async (offer, offerSendId) => {

  try {
 
    console.log("offsend  id : " , offerSendId);

    if(myPeerConnections[offerSendId]) return;
    const myPeerConnection = await makeConnection(offerSendId)
    myPeerConnection.addEventListener("datachannel", (event) => {
      myDataChannel = event.channel;
      myDataChannel.addEventListener("message", (event) =>
        console.log(event.data)
      );
    });
    console.log("received the offer");
    
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, offerSendId, socket.id);
    console.log("sent the answer");
  } catch (error) {
    console.log(error);
  }

});

socket.on("answer", (answer, socketId) => {
  console.log("received the answer", socketId);
  const myPeerConnection = myPeerConnections[socketId];
  if(!myPeerConnection) return
  myPeerConnection.setRemoteDescription(answer);
  console.log(myPeerConnections)
});

socket.on("ice", (ice, socketId) => {
  console.log("received candidate", socketId);

  const myPeerConnection = myPeerConnections[socketId];
  if(!myPeerConnection) return
  myPeerConnection.addIceCandidate(ice);

});

// RTC Code
async function makeConnection(socketId) {
 

  if(myPeerConnections[socketId]){
    return
  }


  const myPeerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: ['turn:49.50.163.173?transport=tcp' , 'turn:49.50.163.173?transport=udp'],
        credential: 'test123',
        username: 'test'
      }
    ]
  });

  
  myPeerConnection.addEventListener("icecandidate", (data) =>{
    socket.emit("ice", data.candidate, socket.id, socketId);
  });

  // ????????? ??????????????? ?????? api ???????????? ?????? ??????
  if(myPeerConnection.addTrack !== undefined){

    myPeerConnection.addEventListener("track", (data) => {
      console.log(myPeerConnections);
    });
  }else{  
    myPeerConnection.addEventListener("addstream", (data) => {});
  }
  
  // todo (?????? ???????????? ??????????????? => socket connection ??? ????????? close ????????? ?????? ) 
  myPeerConnection.addEventListener("onconnectionstatechange", (e) =>{
    console.log(e);
  })




  myPeerConnection.addEventListener("datachannel", (event) => {
    console.log("datachannel", event)

    event.channel.addEventListener("message", (message) => {
      // console.log(message.data)
      if(firstUser.text !== 'firstUser'){
        image.src = message.data
      }
    

    });



  })
  

  var dataChannelOptions = {
    ordered: true // ?????? ?????? ???
  }
  const myDataChannel = myPeerConnection.createDataChannel("chat", dataChannelOptions);

  myDataChannel.addEventListener("open", (event) => {
    console.log('datachannel open')
  });
  myDataChannel.addEventListener("close", (event) => {
    console.log('datachannel close')
  });

  myDataChannels.push(myDataChannel)

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/restartIce
  myPeerConnection.addEventListener("iceconnectionstatechange", event => {
    if (myPeerConnection.iceConnectionState === "failed") {
      /* possibly reconfigure the connection in some way here */
      /* then request ICE restart */
      myPeerConnection.restartIce();
    }
  });
  
  

  myPeerConnections[socketId] = myPeerConnection;
  return myPeerConnection;  
}

function handleIce(data) {
  console.log("sent candidate");
  socket.emit("ice", data.candidate, roomName);
}
