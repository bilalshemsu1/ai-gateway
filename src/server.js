import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.get('/', async (request, reply) => {
    reply.send({ hello: 'world' });
});

fastify.get("/health", async (request, reply) => {
    reply.send({ status: "ok" });
});

const start = async () => {
    try {
        await fastify.listen({ port: 3000, host: '0.0.0.0' });  

    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }   

}

start();    