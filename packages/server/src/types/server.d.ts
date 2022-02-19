declare interface Context<T> {
    data: T;
    socket: {
        id: string;
        ip: string;
        user: string;
        isAdmin: boolean;
        join: (room: string) => void;
        leave: (room: string) => void;
        emit: (target: string[] | string, event: string, data: any) => void;
    };
}

declare interface RouteHandler {
    (ctx: Context<any>): string | any;
}

declare type Routes = Record<string, RouteHandler | null>;

declare type MiddlewareArgs = Array<any>;

declare type MiddlewareNext = () => void;

declare interface SendMessageData {
    to: string;
    type: string;
    content: string;
}
