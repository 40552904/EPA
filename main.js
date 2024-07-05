var dt = require('./mytimemodule');
var url = require('url');
var fs = require('fs');
var ex = require('express');
var sess = require('express-session');
var mysql = require('mysql');
var mdb = require('net');
var path = require('path');
var sio = require('socketio');
var bp = require('body-parser');
var md5 = require('md5');
var cp = require('child_process');

var conn = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "123",
	database: "fishy"
});
	
conn.connect(function(err) {
	if (err) throw err;
	console.log("db connected");	
});

var app = ex();


app.use(ex.static('public'));
app.use('/css', ex.static(__dirname + 'public/css'))
app.use('/js', ex.static(__dirname + 'public/js'))
app.use('/img', ex.static(__dirname + 'public/images'))
app.set('views','./views');
app.set('view engine', 'pug');

app.use(sess({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));

app.use(bp.urlencoded({ extended: true }));

app.use(function(req, res, next) {
	// log all requests
	console.log(dt.timeStamp() + " - " + req.url);
	next();
});

app.get('/', function(req, res) {
	res.redirect(302, 'login');
});

app.get('/login', function(req, res) {
	res.render('login', {message: "Log In"});
});



app.post('/login', function(req, res) {
	console.log("logging in", req.body.username);
	
	var sql = "SELECT * FROM users where username = ? AND password = ?"
	conn.query(sql, [req.body.username, md5(req.body.password)], function (err, result, fields) {
    	if (err) throw err;
    	
    	if (result && result.length) {
    		req.session.loggedin = true;
    		req.session.username = req.body.username;
			res.redirect(302, 'mainpage');
		} else {
			res.render('login', {message: "Incorrect Credentials"});
		}
		res.end(); 
	});
});

app.use((req, res, next) => {
	res.set('Cache-Control', 'no-store');
	next();
})

app.get('/mainpage', function(req, res) {
	if (req.session.loggedin) {
		res.render('mainpage', {title: "Welcome", user: req.session.username});
	} else {
		res.redirect(302, 'login');
	}
});

app.get('/feedback', function(req, res) {
	if (req.session.loggedin) {
		var sql = "SELECT * FROM (SELECT name, DATE_FORMAT(date, '%d-%m-%Y') as date, message FROM feedback ORDER BY date DESC LIMIT 4)tbl";
		conn.query(sql, function (err, result, fields) {
			if (err) throw err;
			console.log(result);
			if (result) {
				res.render('feedback', {title: "Feedback", res: result.length ? result : null});
			}
			res.end(); 
		});
	} else {
		res.redirect(302, 'login');
	}
});

app.post('/feedback', function(req, res) {
	if (req.session.loggedin) {
		var sql = "INSERT INTO feedback (name, date, message) VALUES (?, CURDATE(), ?)";
		conn.query(sql, [req.session.name, req.body.feedback], function (err, result) {
			if (err) 
				console.log(err);
			else
				console.log(result);
			res.redirect(302, 'feedback');
		});
	} else {
		res.redirect(302, 'login');
	}
});

app.get('/fish', function(req, res) {
	if (req.session.loggedin) {
		res.render('fish', {title: "Fish for Sale", user: req.session.username});
	} else {
		res.redirect(302, 'login');
	}
});

app.post('/fish', function(req, res) {
	if (req.session.loggedin) {
		if (req.body.fish_type && req.body.fish_type.length) {
			
			var data = req.body.fish_type;
			
			conn.query(`select * from fish where name = '${data}'`, [data],  (err, result) => {
				if (err) {
					res.redirect(302, 'fish')
					return console.log(err);
				}
				console.log(result);					
				if (result.length) {
					res.render('fish', {title: "Fish for Sale", 
										user: req.session.username,
										resData: result});
				} else {
					res.render('fish', {title: "Fish for Sale", 
										user: req.session.username,
										fail: "No results found for " + req.body.fish_type});
				}
			
			});
		
		} else {
			res.render('fish', {title: "Fish for Sale", 
									   user: req.session.username,
									   fail: "search term cannot be empty"});
		}
	} else {
		res.redirect(302, 'login');
	}
});

app.get('/services', function(req, res) {
	if (req.session.loggedin) {
		var sql = "SELECT * FROM services";
		conn.query(sql, function (err, result, fields) {
			if (err) throw err;
			console.log(result);
			if (result) {
				res.render('services', {title: "Services", 
										user: req.session.username,
										data : result});
			} 
			res.end(); 
		});
	} else {
		res.redirect(302, 'login');
	}
});


app.get('/logout', function(req, res) {
	if (req.session.loggedin) {
		req.session.loggedin = false;
	} 
	
	res.redirect(302, 'login');
});

app.listen(8080);
