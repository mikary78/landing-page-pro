import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

export async function hello(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('HTTP trigger function processed a request.');
    const name = request.query.get('name') || await request.text() || 'world';

    return {
        status: 200,
        body: `Hello, ${name}!`
    };
}

app.http('hello', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: hello
});
