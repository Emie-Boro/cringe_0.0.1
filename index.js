const express = require('express')
const path = require('path')
const exphbs = require('express-handlebars')
const app = express()
const cors = require('cors')
const axios = require('axios')
require('dotenv').config({ path: path.join(__dirname, 'config', '.env') });


app.use(cors())
app.use(express.static('public'))
app.engine('.hbs', exphbs.engine({extname: '.hbs', defaultLayout: 'main' }));
app.set('view engine', '.hbs');

app.get('/', async (req, res) => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/trending/?timeline=week`, {
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const data = await response.data;

        // Fetching image and season data in parallel
        const promises = data.map(async (item) => {
            try {
                // Extracting slug from URL
                item.slug = item.url.substring(item.url.indexOf('/category/') + '/category/'.length);
                item.url = '';

                // Fetching image data
                const imgResponse = axios.get(`${process.env.BASE_URL}/details/category/${item.slug}`, {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                // Fetching season data
                const seasonsResponse = axios.get(`${process.env.BASE_URL}/seasons/${item.slug}`, {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                // Waiting for both promises to resolve
                const [img, seasonsData] = await Promise.all([imgResponse, seasonsResponse]);

                // Assigning image and season data to item
                item.img = img.data.image;
                item.id = seasonsData.data.seasons[0][1];

                return item;
            } catch (error) {
                // Log and handle errors
                console.error('Error fetching data for item:', item, error);
                return null;
            }
        });

        // Waiting for all promises to resolve
        const resolvedItems = await Promise.all(promises);

        // Filtering out null values (items with errors)
        const validItems = resolvedItems.filter(item => item !== null);

        // Rendering the page with the valid data
        res.render('index', {
            data: validItems
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Getting Episodes of a Season
// /slug/id
app.get('/:slug/:id', async (req,res)=>{
    try {
        const episodes = await axios.get(`${process.env.BASE_URL}/episodes/${req.params.slug}/${req.params.id}`);
        const slug = req.params.slug;
        const data = episodes.data.map(([ep_id, name])=> ({ep_id, name, slug}))
        res.render('episodes', {
            layout: 'demo',
            data
        })
    } catch (error) {
        res.status(400).json({error: error})
    }
})

// Getting the Episode Source
// Episode = ep_id
// /source/one-piece/ep_id
app.get('/source/:slug/:ep_id', async (req,res)=>{
    try {
        const source = await axios.get(`${process.env.BASE_URL}/source/${req.params.slug}/${req.params.ep_id}`)
        const data = source.data
        res.render('stream', {
            layout: 'demo',
            data
        })
    } catch (error) {
        res.status(400).json({error: error})
    }
})

app.listen(process.env.PORT, ()=>console.log('Server running...'))
