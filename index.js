const fs = require('fs');
const readline = require('readline');
const { MongoClient } = require('mongodb');

/** mongodb config */
const config = {
	local: {
		dbOptions: {
			// useNewUrlParser: true,
			// useUnifiedTopology: true,
			auth: {
				username: '',
				password: '',
			},
		},
		dbUri: 'mongodb://localhost:27017/HC_App_local_data',
		dbName: 'HC_App_local_data',
	}
};

/** App db name list */
const dbNames = [
	'CaseData',
	'CasePlan',
	'EmployeeFootprint',
	'EmployeeVitalSign',
	'MessageData',
	'OfflineEmployeeData',
	'OfflineRecord',
	'OfflineTOCCForm',
	'ServiceItemData',
	'ServiceRecord',
	'shift',
	'shiftRecord',
	'TOCCFormRecord'
];

const configEnv = 'local';
const { dbOptions, dbUri, dbName } = config[configEnv];
let dbClient = null;

async function connectDB() {
	try {
		const client = new MongoClient(dbUri, dbOptions);
		await client.connect();
		const db = client.db(dbName);
		console.log('db connect success...');
		return { client, db };
	} catch (err) {
		console.log('part1 err', err.stack);
		throw new Error('db connect fail...');
	}
}

async function renameFile() {
	for await(const name of dbNames) {
		fs.rename(`./data/${name}.txt`, `./data/${name}.json`, () => {
			console.log('====== rename file', name);
		});
	}
}

async function importData({ db }) {
	for await(const name of dbNames) {
		/** collection  */
		const collection = db.collection(name);
		/** file data */
		let data = require(`./data/${name}.json`);
		console.log('====== data.length:', data.length);

		if (data.length > 0) {
			// add data
			console.log(`====== insert ${name} data start ======`);
			await collection.insertMany(data);
			console.log(`====== insert ${name} data end ======`);
		}
	}
}

async function removeData({ db }) {
	for await(const name of dbNames) {
		/** collection  */
		const collection = db.collection(name);
		let data = require(`./data/${name}.json`);
		if (data.length > 0) {
			// remove data
			console.log(`====== remove ${name} data start ======`);
			await collection.deleteMany();
			console.log(`====== remove ${name} data end ======`);
		}
	}
}

async function main(command) {
	const { client, db } = await connectDB();
	dbClient = client;

	const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

	await rl.question('請輸入指令（insert/remove）：', async (command) => {
		console.log(`====== start ${command} ======`);

		switch(command) {
			case 'insert':
				await renameFile();
				await importData({ db });
				break;
			case 'remove':
				await removeData({ db });
				break;
			default:
				break;
		}

		rl.close();
		await client.close();
		console.log('====== db connect close ======');
	});
}

main()
	.catch(err => {
		console.log('main err.stack', err.stack);
		if (!!dbClient) {
			dbClient.close();
		}
	});
