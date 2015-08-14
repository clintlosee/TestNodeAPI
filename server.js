// BASE SETUP ===================

// CALL THE PACKAGES -------------
var express     = require('express'),
    app         = express(),
    bodyParser  = require('body-parser'),
    morgan      = require('morgan'),
    mongoose    = require('mongoose')
    port        = process.env.PORT || 8000,
    User        = require('./app/models/user.js');

// connect to the database (hosted on mongolab)
// mongoose.connect('mongodb://closee:flyfish80@ds031883.mongolab.com:31883/nodeapitest');
// connect to local db
mongoose.connect('mongodb://localhost/nodeapi');

// APP CONFIG -------
// use body parser to grab POST request info
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// configure app to handle CORS requests
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');
    next();
});

// log all requests to the console
app.use(morgan('dev'));

// ROUTES FOR THE API ------------

// basic route for home page
app.get('/', function(req, res) {
    res.send('Welcome to the home page');
});

// get express router
var apiRouter = express.Router();

// middleware to use for all requests
apiRouter.use(function(req, res, next) {
    // logg stuff
    console.log('Somone just came to our app!');

    next();
});

// test route to make sure it works
// access at GET http://localhost:8000/api
apiRouter.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to the api!' });
});

// more routes will go here
apiRouter.route('/users')
    // create a user (access at POST http://localhost:8000/api/users)
    .post(function(req, res) {
        // create  a new instance of the User model
        var user = new User();

        // set the users information (comes from the request)
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        // save the user and check for errors
        user.save(function(err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists. '});
                else {
                    return res.send(err);
                }
            }

            res.json({ message: 'User created!' });
        });
    })

    // get all the users (access at GET http://localhost:8000/api/users)
    .get(function(req, res) {
        User.find(function(err, users) {
            if (err) res.send(err);

            // return the users
            res.json(users);
        });
    });

apiRouter.route('/users/:user_id')

    // get the user with that id
    // (access at GET http://localhost:8000/api/users/:user_id)
    .get(function(req, res) {
        User.findById(req.params.user_id, function(err, user) {
            if(err) res.send(err);

            // return the user
            res.json(user);
        });
    })

    // update the user with this id
    // (access at PUT http://localhost:8000/api/users/:user_id)
    .put(function(req, res) {

        // use the user model to find the user we want
        User.findById(req.params.user_id, function(err, user) {
            if(err) res.send(err);

            // update the user info only if its new
            if(req.body.name) user.name = req.body.name;
            if(req.body.username) user.username = req.body.username;
            if(req.body.password) user.password = req.body.password;

            // save the user
            user.save(function(err) {
                if (err) res.send(err);

                // return a message
                res.json({ message: 'User updated' });
            });
        });
    })

    // delete the user with this id
    // (access at DELETE http://localhost:8000/api/users/:user_id)
    .delete(function(req, res) {
        User.remove({
            _id: req.params.user_id
        }, function(err, user) {
            if (err) return res.send(err);

            res.json({ message: 'Successfully deleted' });
        });
    });

// REGISTER OUR ROUTES -------------
// all our routes will be prefixed by /api
app.use('/api', apiRouter);

// START THE SERVER ---------------
app.listen(port);
console.log('Magic happening on port ' + port);