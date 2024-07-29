const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const session = require('express-session');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Create a transporter using Gmail SMTP (copying data to another location)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'saricha.tsee@gmail.com',
        pass: 'kojf clhj okxa xxaf',
    },
});

// Handle POST request to /sendEmail
app.post('/sendEmail', (req, res) => {
    const { fullName, email, message } = req.body;

    // Email content
    const mailOptions = {
        from: 'Your Name <saricha.tsee@gmail.com>',
        to: '22034013@myrp.edu.sg', // Change to your recipient email address
        subject: 'Contact Form Submission',
        text: `Name: ${fullName}\nEmail: ${email}\nMessage: ${message}`
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send('Failed to send email');
        }
        console.log('Email sent:', info.response);
        res.redirect('/'); // Redirect after sending email
    });
});

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // Adjust the path as necessary
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const connection = mysql.createConnection({
    host: 'qwerty',
    user: 'qwerty',
    password: 'NSb@v5v4BN%7N4n',
    database: 'freedb_freedb_birdapp'
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to database: ', err.message);
        return;
    }
    console.log('Connected to database');
});

const getFamilies = (callback) => {
    const query = 'SELECT familyID, name FROM family';
    connection.query(query, (err, results) => {
        if (err) throw err;
        callback(results);
    });
};

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.get('/', (req, res) => {
    const { search } = req.query;
    let sql = 'SELECT * FROM birds';

    if (search) {
        sql += ` WHERE nameCommon LIKE '%${search}%' OR nameScientific LIKE '%${search}%'`;
    }

    connection.query(sql, (error, results) => {
        if (error) {
            console.error('Database query error: ', error.message);
            return res.status(500).send('Error Retrieving Birds');
        }
        res.render('index', { birds: results, typeofVariable: search });
    });
});

const getFamiliesAndStatuses = (callback) => {
    const sqlFamilies = 'SELECT familyID, name FROM family';
    const sqlStatuses = 'SELECT * FROM status';
    connection.query(sqlFamilies, (error, familyResults) => {
        if (error) {
            return callback(error);
        }
        connection.query(sqlStatuses, (error, statusResults) => {
            if (error) {
                return callback(error);
            }
            callback(null, familyResults, statusResults);
        });
    });
};

app.get('/addBird', (req, res) => {
    getFamiliesAndStatuses((error, families, statuses) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error getting families and statuses');
        }
        res.render('addBird', { families, statuses });
    });
});

app.post('/addBird', (req, res) => {
    const { nameCommon, nameScientific, family, checkInvasive, image, statusID } = req.body;
    const isInvasive = checkInvasive ? 1 : 0;
    const sql = 'INSERT INTO birds (nameCommon, nameScientific, familyID, isInvasive, image, statusID) VALUES (?, ?, ?, ?, ?, ?)';
    connection.query(sql, [nameCommon, nameScientific, family, isInvasive, image, statusID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error adding bird');
        }
        res.redirect('/');
    });
});

app.get('/bird/:id', (req, res) => {
    const birdID = req.params.id;
    const sql = `
        SELECT birds.*, family.name AS familyName, status.name AS statusName
        FROM birds
        JOIN family ON birds.familyID = family.familyID
        JOIN status ON birds.statusID = status.statusID
        WHERE birds.birdID = ?`;

    connection.query(sql, [birdID], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error getting Bird');
        }
        if (results.length > 0) {
            res.render('bird', { bird: results[0] });
        } else {
            res.status(404).send('Bird Not Found');
        }
    });
});

app.get('/editBird/:id', (req, res) => {
    const birdID = req.params.id;
    const sqlBird = 'SELECT * FROM birds WHERE birdID = ?';

    connection.query(sqlBird, [birdID], (error, birdResults) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error getting bird');
        }

        if (birdResults.length === 0) {
            return res.status(404).send('Bird not found');
        }

        getFamiliesAndStatuses((error, familyResults, statusResults) => {
            if (error) {
                console.error('Database query error:', error.message);
                return res.status(500).send('Error getting families and statuses');
            }
            res.render('editBird', {
                bird: birdResults[0],
                families: familyResults,
                statuses: statusResults
            });
        });
    });
});

app.post('/editBird/:id', upload.single('image'), (req, res) => {
    const birdID = req.params.id;
    const { nameCommon, nameScientific, family, checkInvasive, statusID } = req.body;
    const isInvasive = checkInvasive ? 1 : 0;
    const image = req.file ? req.file.filename : null;

    const sql = 'UPDATE birds SET nameCommon = ?, nameScientific = ?, familyID = ?, isInvasive = ?, statusID = ?' + (image ? ', image = ?' : '') + ' WHERE birdID = ?';
    const params = [nameCommon, nameScientific, family, isInvasive, statusID];
    if (image) params.push(image);
    params.push(birdID);

    connection.query(sql, params, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error updating bird');
        }
        res.redirect(`/bird/${birdID}`);
    });
});

app.get('/deleteBird/:id', (req, res) => {
    const birdID = req.params.id;
    const sql = 'DELETE FROM birds WHERE birdID = ?';
    connection.query(sql, [birdID], (error, results) => {
        if (error) {
            console.error('Error deleting Bird:', error.message);
            return res.status(500).send('Error deleting Bird');
        }
        res.redirect('/');
    });
});

app.post('/deleteBird/:id', (req, res) => {
    const birdID = req.params.id;
    const sql = 'DELETE FROM birds WHERE birdID = ?';
    connection.query(sql, [birdID], (error, results) => {
        if (error) {
            console.error('Error deleting Bird:', error.message);
            return res.status(500).send('Error deleting Bird');
        }
        res.redirect('/');
    });
});

app.get('/addFamily', (req, res) => {
    getFamilies((families) => {
        res.render('addFamily', { families });
    });
});

app.post('/addFamily', (req, res) => {
    const { name } = req.body;
    console.log('Received form data:', name); // Log the received form data

    const sql = 'INSERT INTO family (name) VALUES (?)';
    connection.query(sql, [name], (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error adding family');
        }
        console.log('New family added:', results); // Log the results of the SQL query
        res.redirect('/'); // Redirect to the homepage after successful insertion
    });
});


app.get('/sightings', (req, res) => {
    const query = `
        SELECT sightings.*, users.username, birds.nameCommon
        FROM sightings
        INNER JOIN users ON sightings.userID = users.userID
        INNER JOIN birds ON sightings.birdID = birds.birdID
        ORDER BY sightings.date DESC`;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error fetching sightings');
        }
        res.render('sightings', { sightings: results });
    });
});

app.post('/sightings', (req, res) => {
    const { userID, birdID, location, date, sightingimages, birdCount, isVerified } = req.body;
    const sql = 'INSERT INTO sightings (userID, birdID, location, date, sightingimages, birdCount, isVerified) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [userID, birdID, location, date, sightingimages, birdCount, isVerified];

    connection.query(sql, values, (error, results) => {
        if (error) {
            console.error('Database query error:', error.message);
            return res.status(500).send('Error adding sighting');
        }
        res.redirect('/sightings');
    });
});

app.get('/birdFamily/:familyID', (req, res) => {
    const familyID = req.params.familyID;
    const sql = 'SELECT * FROM birds WHERE familyID = ?';
    connection.query(sql, [familyID], (error, results) => {
        if (error) {
            console.error('Error retrieving birds:', error.message);
            return res.status(500).send('Error retrieving birds');
        }
        res.render('index', { birds: results });
    });
});

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

//kmkjm