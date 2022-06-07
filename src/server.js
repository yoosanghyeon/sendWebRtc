import http from  "http";
import SocketIO from "socket.io";
import express from "express";
import path from "path";
import cors from 'cors';
import fs from "fs";

const app = express();
const port = 3001;

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));



app.get("/", (_, res) => {
  res.render("home");

});


app.get("/*", (_, res) => res.redirect("/"));



const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer, {
  pingTimeout: 2000,
  pingInterval: 2000,
  cors: {
    origin: '*',
  },
  maxHttpBufferSize: 100000000
});

let users = {};



wsServer.on("connection", (socket) => {
    console.log('connection run ')


  socket.on('video', (videoStream) =>{

    
    var messagelength = videoStream.toString().length;
    console.log('messagelength', messagelength)
    // if (JSON.stringify(videoStream).length > 60000) {
      
    //   return;
    // }
    // 0.1초당 20kb webrtc 전송 예정

 
    if(users[roomName] && users[roomName].length > 0){
      wsServer.sockets.to(users[roomName][0].id).emit("stream", videoStream);
    }
    
  })


  const roomName = 'TEST'
    
  socket.on("join_room", () => {
    console.log('join_room')
    socket.join(roomName);
    
    if(users[roomName]){
      users[roomName].push({id: socket.id})  
    }else{
      users[roomName] = [{id: socket.id}]
    }
    console.log(users)
    const usersInThisRoom = users[roomName].filter(user => user.id !== socket.id);
    wsServer.sockets.to(socket.id).emit("welcome", usersInThisRoom, socket.id);

  });

  socket.on("offer", (offer, offerRecivedId, offerSendId) => {
    console.log('offer')  
    wsServer.sockets.to(offerRecivedId).emit("offer", offer, offerSendId);
  });
  socket.on("answer", (answer, offerSendId, mySocketId) => {
    console.log('answer')  
    
    wsServer.sockets.to(offerSendId).emit("answer", answer, mySocketId);
  });
  socket.on("ice", (ice, candidateSendID, candidateReceiveID) => {
    console.log('ice')
    wsServer.sockets.to(candidateReceiveID).emit("ice", ice, candidateSendID);
  });



  // disconnecting event method 를 사용하는 이유는 
  // 해당 접속 소켓의 정보를 잃어버리기 전이기 떄문이다 
  socket.on("disconnecting", (reason) =>{
    
    for(const room of socket.rooms){
       console.log(socket.rooms);
       var joinRoom = users[room];
       if (joinRoom !== undefined){
   
         var idx = joinRoom.findIndex((roomUser) => {
           return roomUser.id === socket.id;
         });
       
         if(idx > -1){
           console.log(room);
           socket.to(room).emit("userDisconnect", socket.id);
           users[room] = users[room].filter((user) => {
             return user.id !== socket.id;
           });
           console.log("remove :: ", users[room]);
         
         }
     
       } 
  
     }
 
   })
 });
 



const handleListen = () => console.log(`Listening on http://localhost:${port}`);
httpServer.listen(port, handleListen);
