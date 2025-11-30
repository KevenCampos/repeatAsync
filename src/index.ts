type repeatAsyncBase = {
    delay: number;
    onError?: (error: any) => void;
    functionToExec: () => Promise<void>;
}

type repeatAsyncWithTimeout = repeatAsyncBase & {
    timeout: number;
    onExcededTimeout?: () => void;
}

type repeatAsyncNoTimeout = repeatAsyncBase & {
    timeout?: never;
    onExcededTimeout?: never;
}

type repeatAsyncParams = repeatAsyncWithTimeout | repeatAsyncNoTimeout;

export function repeatAsync(data: repeatAsyncParams) {
    let timeoutId: NodeJS.Timeout | null = null;
    let stopped = false;

    const executeFunction = async () => {
        if (stopped) return;

        if (data?.timeout) {
            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => {
                    reject(new Error("timeout"));
                }, data.timeout);
            });

            try {
                await Promise.race([data.functionToExec(), timeoutPromise]);
            } catch (error: any) {
                if (error.message === "timeout") {
                    data.onExcededTimeout?.();
                } else {
                    data.onError?.(error);
                }
            }
        } else {
            try {
                await data.functionToExec();
            } catch (error) {
                data?.onError?.(error);
            }
        }
    };

    const loop = async () => {
        await executeFunction();
        if (!stopped) {
            timeoutId = setTimeout(loop, data.delay);
        }
    };

    loop();

    return {
        stop: () => {
            stopped = true;
            if (timeoutId) clearTimeout(timeoutId);
        }
    };
}