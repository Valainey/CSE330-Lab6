// Require the packages we will use:
var http = require("http"),
socketio = require("socket.io"),
fs = require("fs");


// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.

	fs.readFile("client.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.

		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);

var users = {};
var chatrooms =['Lobby',];
//var currentRoom = ['Lobby'];

var count = 0;
var owners = {};
var blacklist = {};
var viproom = [];
var pass = [];



// Do the Socket.IO magic:
var io = socketio.listen(app);
io.sockets.on("connection", function(socket){
	// This callback runs when a new Socket.IO connection is established.*/

	socket.on('message_to_server', function(data) {
		// This callback runs when the server receives a new message from the client.

		console.log("message: "+data["username"] + data["message"]);

		var msg = data["message"];// log it to the Node.JS output
		io.sockets.emit("message_to_client",{message:data["message"], username:data["username"] }) // broadcast the message to other use
	});


	socket.on('newuser', function(data){
		socket.room = 'Lobby';

		username = data.message;
		for (var key in users) {
  		if (users.hasOwnProperty(key)) {
    		if(users[key] == username) {
					socket.emit('invalid_username');
				}
  		}
		}
		socket.username = username;
		users[username] = socket.room;
		count++;

		socket.join('Lobby');
		console.log(username + " has joined the room.");
		//socket.emit('updatechat', {"username": username, "message" : "connect to Lobby"}) ;
		socket.emit('updateusers', {"users": users, "currentRoom": 'Lobby', "count": count });
		socket.to('Lobby').emit('sys', username + ' ' + 'has joined the lobby');
		//socket.broadcast.to('Lobby').emit('updatechat', {"username": username, "message": 'has connected to Lobby'});
		socket.emit('updaterooms', {"chatrooms": chatrooms, "currentRoom": 'Lobby'});

	});

	socket.on("private message", function(receiver, message){
		console.log(receiver);	//sender and receiver in the users list and in the current room
		if(users[receiver] == socket.room){
			socket.broadcast.to(socket.room).emit('private message', receiver, message);
		}
		else{
			"You don't have permission.";
		}

	});

	socket.on('sendchat', function (data) {
		//io.sockets.in(socket.room).emit('updatechat', {"username": username}, data);
		console.log(socket.room);
		socket.room = room;
		io.sockets.in(room).emit('updatechat', {"username": username, "message": message});
	});

	socket.on('leave', function () {
		socket.emit('disconnect');
	});

	socket.on('disconnect', function(){
		var prevRoom = users[socket.username];
		delete users[socket.username];
		--count;
		io.sockets.emit('updateusers', {"users": users, "currentRoom": prevRoom, "count":count});
		console.log(count);
		//update rooms
		socket.to(prevRoom).emit('sys', username + ' ' + 'logged out the room');
		//socket.broadcast.emit('updatechat', {"username": username, "message": 'has disconnected'});
		console.log(socket.room);
		console.log(socket.username);
		socket.leave(socket.room);
		console.log(socket.username + "leave");
	});


	socket.on('createroom', function(newroom,owner){
		 
		socket.room = newroom;
		console.log(newroom); 
		owners[newroom] = owner;
		console.log(owner + 'create' + newroom);
		chatrooms.push(newroom);

		socket.emit('updaterooms', {"chatrooms":chatrooms, "currentRoom": newroom});


	});
	socket.on('createprotected', function(newroom, pass, owner){
	    var roomobj ={};
		roomobj.name = newroom;
		roomobj.pass = pass;
		socket.room = newroom;
		socket.pass = pass;
		console.log(newroom); 
		owners[newroom] = owner;
		console.log(owner + 'create' + newroom);
		viproom.push(roomobj);
        socket.emit('updateprooms', {"viproom": viproom, "currentRoom": newroom});


	});
	
	socket.on('checkvalid', function(currentProom, pass){
		currentroom = {};
		currentroom.name = currentProom;
		currentroom.pass = pass;
		var index = viproom.indexOf(currentroom);
	
		if (viproom[index] == currentroom){
			//if (pass[index] = pass){
				socket.emit('updateprooms', {"viproom": viproom, "currentRoom": currentProom});
			}
			else {
				console.log("Wrong match");
				
			}
		
		
		
		var previousroom = socket.room;
		socket.leave(socket.room);
		console.log(socket.username + 'has left' + previousroom);
		socket.join(room);
		console.log(socket.username + 'has joined' +room);
		users[socket.username] = room;
		//socket.emit('updatechat', {"username":username, "message": "are connected into the  newroom"});
		socket.broadcast.to(previousroom).emit('updatechat', {"username": username, "message": 'has left the room'});
		io.sockets.in(previousroom).emit('updateusers', {"users":users, "currentRoom": previousroom, "count":count});
		socket.to(room).emit('sys', username + ' ' + 'are connected to the newroom');
		//users[socket.username] = room;
		socket.room = room;
		socket.broadcast.to(room).emit('updatechat', {"username": username, "message": 'has added the newroom'});
		io.sockets.in(room).emit('updateusers',{"users":users, "currentRoom":room, "count": count});
		console.log(users);
		socket.emit('updateprooms', {"viproom": chatrooms, "currentRoom": room });
		
		
	});

	socket.on('switchroom', function(room){
		var previousroom = socket.room;
		console.log("look here" + previousroom);
		socket.leave(socket.room);
		console.log(socket.username + 'has left' + previousroom);
		socket.join(room);
		console.log(socket.username + 'has joined' +room);
		users[socket.username] = room;
		//socket.emit('updatechat', {"username":username, "message": "are connected into the  newroom"});
		socket.broadcast.to(previousroom).emit('updatechat', {"username": username, "message": 'has left the room'});
		io.sockets.in(previousroom).emit('updateusers', {"users":users, "currentRoom": previousroom, "count":count});
		socket.to(room).emit('sys', username + ' ' + 'are connected to the newroom');
		//users[socket.username] = room;
		socket.room = room;
		socket.broadcast.to(room).emit('updatechat', {"username": username, "message": 'has added the newroom'});
		io.sockets.in(room).emit('updateusers',{"users":users, "currentRoom":room, "count": count});
		console.log(users);
		socket.emit('updaterooms', {"chatrooms": chatrooms, "currentRoom": room });




	});

	socket.on('kick temp', function(target, owner){
		//console.log(target);

		if(owner == owners[socket.room]){
			//delete users[target];

			//kick the target to the Lobby and then delete that target
			io.sockets.in(socket.room).emit('kick temp', target);
			console.log(owner + "kicked" + target);

		}
		else{
			console.log("You can't kick that person!");
		}

	});

	socket.on("ban all", function(target, owner){
	console.log(target);
		if(owner == owners[socket.room]){
			io.sockets.in(socket.room).emit('ban', target, socket.room);
		}
		else{
			console.log(" You can't ban that person!");
		}
	});




	socket.on('isTyping', function(username){
		username = socket.username;
		socket.broadcast.emit('showtyping', {"username" : username});
	});




	socket.on('displayusers', function () {
		socket.emit('displayusers', {"username": username, "count": count, "currentRoom": currentRoom});
	});





});