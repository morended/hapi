var Hapi= require('hapi');
const Inert = require('inert');
var server= new Hapi.Server();
var uuid = require('uuid');
var fs= require('fs');
var Joi = require('joi');
var Boom=require('boom');

var cards=loadCards();
server.connection({port:3000});

server.register({
        register: require('vision'),
        once: true
    }),

server.views({
    engines:{
        html:require('handlebars')
    },
    path:'./templates'
});
server.register(Inert,function () {})

server.register({
    register: require('good'),
    options: {
        opsInterval: 5000,
        reporters: [
            {
                reporter: require('good-file'),
                events: {ops: '*'},
                config: {
                    path: './logs',
                    prefix: 'hapi-process',
                    rotate: 'daily'
                }
            },
            {
                reporter: require('good-file'),
                events: {response: '*'},
                config: {
                    path: './logs',
                    prefix: 'hapi-requests',
                    rotate: 'daily'
                }
            },
            {
                reporter: require('good-file'),
                events: {error: '*'},
                config: {
                    path: './logs',
                    prefix: 'hapi-error',
                    rotate: 'daily'
                }
            }
        ]
    }
},function(err) {
    console.log(err);
});

server.ext('onPreResponse', function(request,reply){
    if(request.response.isBoom){
        return reply.view('error',request.response);
    }
    reply.continue();
});
server.route({
    path: '/',
    method: 'GET',
    handler:{
        file:'templates/index.html'
    }
});
server.route({
    path: '/assets/{path*}',
    method:'GET',
    handler:{
        directory:{
            path:'./public',
            listing:false
        }
    }

});

server.route({
    path:'/cards/new',
    method:['GET','POST'],
    handler: newCardHandler
});

server.route({
    path:'/cards',
    method:'GET',
    handler: cardsHandler
});

server.route({
    path:'/cards/{id}',
    method:'DELETE',
    handler: deleteCard
});

var cardSchema=Joi.object().keys({
    name:Joi.string().min(3).max(20).required(),
    recipient_email:Joi.string().email().required(),
    sender_name:Joi.string().min(3).max(20).required(),
    sender_email:Joi.string().email().required(),
    card_image:Joi.string().required()

    });
function newCardHandler(request,reply){
    if(request.method ==='get'){
        reply.view('new',{card_images:loadImages()});
    }
    else{
        Joi.validate(request.payload,cardSchema,function(err,val){
            if(err){
             return reply(Boom.badRequest(err.details[0].message));
            }
            var card={
                name:val.name,
                recipient_email:val.recipient_email,
                sender_name:val.sender_name,
                sender_email:val.sender_email,
                card_image:val.card_image
            };
            addCard(card);
            reply.redirect('/cards');
        });



    }
}

function cardsHandler(request,reply){
    reply.view('cards',{cards :cards});
}

function addCard(card){
    var id= uuid.v1();
    cards[id]=card;
    console.log(cards);
}

function deleteCard(request,reply){
    console.log(cards[request.params.id]);
   delete cards[request.params.id];
   reply();
}

function loadCards(){
    var file = fs.readFileSync('./cards.json');
    return JSON.parse(file.toString());
}
function loadImages(){
console.log(fs.readdirSync('./public/images/cards/'));
   return fs.readdirSync('./public/images/cards/');

}

server.start(function() {
    console.log('Listening on' + server.info.uri)
});