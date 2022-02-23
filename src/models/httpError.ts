// class HttpError extends Error {
//   status: number;
//   message: string;
//   constructor(message: string, status: number) {
//     super(message);
//     this.status = status;
//     this.message = message;
//   }
// }

// Public Allow to make this shorter

// class HttpError extends Error {
//   constructor(public message: string, public status: number) {
//     super(message);
//   }
// }

// readonly it is similar to const
class HttpError extends Error {
  constructor(public readonly message: string, public readonly status: number) {
    super(message);
  }
}

export default HttpError;
