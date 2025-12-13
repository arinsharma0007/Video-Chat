import React, { useEffect, useRef, useState } from "react";
import styles from"../styles/videoComponent.module.css";
import {TextField , IconButton, Badge}from "@mui/material";
import Button from "@mui/material/Button";
import { io } from "socket.io-client";
import VideocamIconOff from "@mui/icons-material/VideocamOff"
import VideocamIcon from "@mui/icons-material/Videocam"
import CallEndIcon from "@mui/icons-material/CallEnd"
import MicIcon from "@mui/icons-material/Mic"
import MicOffIcon from "@mui/icons-material/MicOff"
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import { useNavigate } from "react-router-dom";
import server from "../environment";



const server_url = server; //This is going to store in the env
var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function VideoMeetComponent() {
   var socketRef = useRef();
    let socketIdRef = useRef();

    let localVideoRef = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);

    let [audioAvailable, setAudioAvailable] = useState(true);

    let [captureVideo, setCaptureVideo] = useState(false);
    let [captureAudio, setCaptureAudio] = useState(false);

    let [screen, setScreen] = useState();

    let [showModal, setModal] = useState(true);

    let [screenAvailable, setScreenAvailable] = useState();

    let [messages, setMessages] = useState([])

    let [message, setMessage] = useState("");

    let [newMessages, setNewMessages] = useState(0);

    let [askForUsername, setAskForUsername] = useState(true);

    let [username, setUsername] = useState("");

    const videoRef = useRef([]);

    let [videos, setVideos] = useState([]);

  // TODO
  //   if(isChrome() === false){

  //   }
  // ...existing code...
  const getPermissions = async () => {
    try {
      let videoOk = false;
      let audioOk = false;

      try { await navigator.mediaDevices.getUserMedia({ video: true }); videoOk = true; } catch { videoOk = false; }
      setVideoAvailable(videoOk);

      try { await navigator.mediaDevices.getUserMedia({ audio: true }); audioOk = true; } catch { audioOk = false; }
      setAudioAvailable(audioOk);

      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      if (videoOk || audioOk) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: videoOk, audio: audioOk });
        window.localStream = userMediaStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = userMediaStream;
      }
    } catch (error) {
      console.log(error);
    }
  };


  useEffect(() => {
    getPermissions();
  }, []);


  let getUserMediaSuccess = (stream) => {
        try {
            window.localStream.getTracks().forEach(track => track.stop())
        } catch (e) { console.log(e) }

        window.localStream = stream
        localVideoRef.current.srcObject = stream

        for (let id in connections) {
            if (id === socketIdRef.current) continue

            connections[id].addStream(window.localStream)

            connections[id].createOffer().then((description) => {
                console.log(description)
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                    })
                    .catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setCaptureVideo(false);
            setCaptureAudio(false);

            try {
                let tracks = localVideoRef.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

             let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            localVideoRef.current.srcObject = window.localStream;

            

            for (let id in connections) {
                connections[id].addStream(window.localStream)

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
                        })
                        .catch(e => console.log(e))
                })
            }
        })
    }

      let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };
  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

   let getUserMedia = () => {
    if ((captureVideo && videoAvailable) || (captureAudio && audioAvailable)) {
      navigator.mediaDevices.getUserMedia({ video: captureVideo, audio: captureAudio })
        .then(getUserMediaSuccess)
        .catch((e) => console.log(e));
    } else {
      try { let tracks = localVideoRef.current.srcObject.getTracks(); tracks.forEach(t => t.stop()); } catch {}
    }
  };

  useEffect(() => {
    if (captureVideo !== undefined && captureAudio !== undefined) {
      getUserMedia();
    }
  }, [captureAudio, captureVideo]);

  //TODO
  let gotMessageFromServer = (fromId, message) => {
    var signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId]
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === "offer") {
              connections[fromId]
                .createAnswer()
                .then((description) => {
                  connections[fromId]
                    .setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit(
                        "signal",
                        fromId,
                        JSON.stringify({
                          sdp: connections[fromId].localDescription,
                        })
                      );
                    })
                    .catch((e) => {
                      console.log(e);
                    });
                })
                .catch((e) => {
                  console.log(e);
                });
            }
          })
          .catch((e) => {
            console.log(e);
          });
      }
      if (signal.ice) {
        connections[fromId]
          .addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch((e) => console.log(e));
      }
    }
  };

  //TODO
  let addMessage = (data , sender , socketIdSender) => {
      setMessages((prevMessages) =>[
      ...prevMessages ,
      {sender : sender , data : data}
  ]);

  if(socketIdSender !== socketIdRef.current) {
    setNewMessages((prevMessages) => prevMessages + 1)
  }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on("signal", gotMessageFromServer);

    socketRef.current.on("connect", () => {
      socketRef.current.emit("join-call", window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on("chat-message", addMessage);

      socketRef.current.on("user-left", (id) => {
        setVideos((videos) => videos.filter((video) => video.socketId !== id));
      });

      socketRef.current.on("user-joined", (id, clients) => {
        clients.forEach((socketListId) => {
          if (socketListId === socketIdRef.current) return;
          connections[socketListId] = new RTCPeerConnection(
            peerConfigConnections
          );
          // Wait for their ice candidate
          connections[socketListId].onicecandidate =  (event)=> {
            if (event.candidate != null) {
              socketRef.current.emit(
                "signal",
                socketListId,
                JSON.stringify({ "ice": event.candidate })
              );
            }
          };

          // Wait for their video stream
          connections[socketListId].onaddstream = (event) => {
            console.log("BEFORE:", videoRef.current);
            console.log("FINDING ID: ", socketListId);

            let videoExists = videoRef.current.find(
              (video) => video.socketId === socketListId
            );

            if (videoExists) {
              console.log("FOUND EXISTING");

              // Update the stream of the existing video
              setVideos((prev) => {
           const updatedVideos = prev.map((v) =>
                  v.socketId === socketListId ? { ...v, stream: event.stream } : v
                );
                videoRef.current = updatedVideos;
                return updatedVideos;
              })
                
              
            } else {
              // Create a new video
              console.log("CREATING NEW");
              let newVideo = {
                socketId: socketListId,
                stream: event.stream,
                autoplay: true,
                playsinline: true,
              }

              setVideos((videos) => {
                const updatedVideos = [...videos, newVideo];
                videoRef.current = updatedVideos;
                return updatedVideos;
              });
            }
          };

          // Add the local video stream
          if (window.localStream !== undefined && window.localStream !== null) {
            connections[socketListId].addStream(window.localStream);
          } else {
            let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            connections[socketListId].addStream(window.localStream);
          }
        });

        if (id === socketIdRef.current) {
          for (let id2 in connections) {
            if (id2 === socketIdRef.current) continue;

            try {
              connections[id2].addStream(window.localStream);
            } catch (e) {console.log(e)}

            connections[id2].createOffer().then((description) => {
              connections[id2]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id2,
                    JSON.stringify({ sdp: connections[id2].localDescription })
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }
      });
    });
  };



  let getMedia = () => {
    setCaptureVideo(videoAvailable);
    setCaptureAudio(audioAvailable);
    connectToSocketServer();
  };

  let routeTo = useNavigate();

  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  let handleVideo = () =>{
    setCaptureVideo(!captureVideo)

  };

  let handleAudio = () =>{
    setCaptureAudio(!captureAudio)

  }

  let getDisplaMediaSucess =  (stream) =>{
    try{
      window.localStream.getTracks().forEach(track => track.stop())
    } catch (e) {console.log(e)}

    window.localStream = stream;
     if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    for(let id in connections){
      if(id === socketIdRef.current) continue;

      connections[id].addStream(window.localStream);
      connections[id].createOffer().then((description) =>{
        return connections[id].setLocalDescription(description).then(() =>{
          socketRef.current.emit("signal" , id , JSON.stringify({"sdp" : connections[id].localDescription}))
        }).catch(e => {console.log(e)})
    })

    }

    stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);

            try {
                let tracks = localVideoRef.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            } catch (e) { console.log(e) }

             let blackSilence = (...args) =>
              new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoRef.current) localVideoRef.current.srcObject = window.localStream;

           getUserMedia();
        })
    }
  



  let getDisplaMedia = () =>{
    if(screen){
      if(navigator.mediaDevices.getDisplayMedia){
      (navigator.mediaDevices.getDisplayMedia({video : true , audio : true}))
      .then(getDisplaMediaSucess)
      .then((stream) =>{})
      .catch((e) =>{console.log(e)})
      }
    }
  }

  useEffect(()=>{
    if(screen !== undefined){
      getDisplaMedia();
    }
  })

  let handleScreen = () =>{
    setScreen(!screen)
  }
 
   let sendMessage = () =>{
    if (!socketRef.current) return;
    socketRef.current.emit("chat-message", message, username);
    setMessage("");
  }

  let handleEndCall = () =>{
    try {
      let tracks = localVideoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop())
    } catch(e){}


    routeTo("/home")
  }

  return (
    <div>
      {askForUsername === true ? 
        <div>
          <h2>Enter into Lobby</h2>
          <TextField
            id="outlined-basic"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            variant="outlined"
          />
          <Button variant="contained" onClick={connect}>
            Connect
          </Button>

          <div>
            <video ref={localVideoRef} autoPlay muted></video>
          </div>
        </div>
      : 
        
          <div className={styles.meetVideoContainer}>
            
            { showModal ? <div className={styles.chatRoom}>
                <div className= {styles.chatContainer}>
                  <h1>Chat</h1>
                  <div className= {styles.chattingDisplay}>
                     {messages.map((item , index) =>{
                       return (
                        <div key = {index}>
                          <p style={{fontWeight : "bold"}}> {item.sender}</p> 
                          <p>{item.data}</p>
                          </div>
                       )
                     })}
                  </div>
                  <div className= {styles.chattingArea}>
                         <TextField  value = {message} onChange={e => setMessage(e.target.value)} id="outlined-basic" label="Outlined" variant="outlined" />
                         <Button variant="contained" onClick={sendMessage}>Send</Button>
                  </div>
                </div>
            </div> : <></>}
            <div className= {styles.butttonContainer}>
                <IconButton onClick = {handleVideo} style={{color : "white"}}>
                    {(captureVideo === true) ? <VideocamIcon /> : <VideocamIconOff/>}
                </IconButton>
                <IconButton onClick={handleEndCall} style={{color : "red"}}>
                    <CallEndIcon />
                </IconButton>
                <IconButton onClick = {handleAudio} style={{color : "white"}}>
                    {(captureAudio === true) ? <MicIcon /> : <MicOffIcon/>}
                </IconButton>
                {
                  screenAvailable === true ?
                  <IconButton onClick={handleScreen} style={{color : "white"}}>
                    {screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon/>
}
                  </IconButton> : <></>
                }

                <Badge badgeContent = {newMessages} max = {999} color="secondary">
                  <IconButton onClick = { ()=>setModal(!showModal)} style={{color : "white"}}>
                    <ChatIcon />
                </IconButton>
                </Badge>
            </div>



            <video className={styles.meetUserVideo} ref={localVideoRef} autoPlay muted></video>
                 <div  className = {styles.conferenceView}>
              {videos.map((video) => (
                <div key={video.socketId}>
                  
                  <video
                    data-socket={video.socketId}
                    ref={(ref) => {
                      if (ref && video.stream) ref.srcObject = video.stream;
                    }}
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
              ))}
            
          </div>
          </div>
         
          
        
      }
    </div>
  );



}