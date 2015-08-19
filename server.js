// BASE SETUP ===================

// CALL THE PACKAGES -------------
var express     = require('express'),
    app         = express(),
    bodyParser  = require('body-parser'),
    morgan      = require('morgan'),
    mongoose    = require('mongoose'),
    jwt         = require('jsonwebtoken'),
    port        = process.env.PORT || 8000,
    User        = require('./app/models/user.js'),
    superSecret = 'thisismysupersecretsecret';

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

// route for authenticating users (POST http://localhost:8000/api/authenticate)
apiRouter.post('/authenticate', function(req, res) {
    // find the user
    // select the name username and password explicityly
    User.findOne({
        username: req.body.username
    }).select('name username password').exec(function(err, user) {

        if (err) throw err;

        // no user with that username was found
        if (!user) {
            res.json({
                success: false,
                message: 'Authentication failed. User not found'
            });
        } else if (user) {

            // check if password matches
            var validPassword = user.comparePassword(req.body.password);
            if (!validPassword) {
                res.json({
                    success: false,
                    message: 'Authentication failed. Wrong password'
                });
            } else {

                // if user is found and password is correct
                // create the token
                var token = jwt.sign({
                    name: user.name,
                    username: user.username
                }, superSecret, {
                    expiresInMinutes: 1440 // expires in 24 hours
                });

                // return the information including token as json
                res.json({
                    success: true,
                    message: 'Enjoy your token',
                    token: token
                });
            }
        }
    });
});

// middleware to use for all requests
apiRouter.use(function(req, res, next) {
    // log stuff
    console.log('Somone just came to our app!');

// token for clintlosee user for testing purposes
// eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJuYW1lIjoiQ2xpbnQiLCJ1c2VybmFtZSI6ImNsaW50bG9zZWUiLCJpYXQiOjE0NDAwMDg5NDIsImV4cCI6MTQ0MDA5NTM0Mn0.jbJYiGlUj7-sLubDUy3C24zMa48Xt6tu1DGEqqbwsZc

    // check header or url params or post params for token
    var token = req.body.token || req.param('token') || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, superSecret, function(err, decoded) {
            if (err) {
                return res.status(403).send({
                    success: false,
                    message: 'Failed to authenticate token.'
                });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;

                next();
            }
        });
    } else {

        // if there is no token
        // return an HTTP response of 403 (access forbidden) and an error message
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
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

            // update the user info only if it is new
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

// api endpoint to get user information
apiRouter.get('/me', function(req, res) {
    res.send(req.decoded);
});

// REGISTER OUR ROUTES -------------
// all our routes will be prefixed by /api
app.use('/api', apiRouter);

// START THE SERVER ---------------
app.listen(port);
console.log('Magic happening on port ' + port);
