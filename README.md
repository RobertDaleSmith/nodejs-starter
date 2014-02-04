Node.js Starter Site
==========

MongoDB, dust.js, Sass, and bcrypt password protected backend implemented.
==========

1.)   Create DB on MongoHQ.com and then fill in DB credentials at the top of server.js

2.)   Create a collections called 'admin-sessions' and 'admin-users'.

3.)   Create document inside 'admin-users' with the following:
		{
		  id: "admin",
		  pwd: "$2a$10$Ts68LOj1yYer.4rEf30oMOobg2HyBXLIePBInq4tR.5N07kjmsKSm",
		  type: "super"
		}

3.)   Run 'npm install'.

4.)   Then run 'node server.js' to start site.

5.)   Go to localhost:8008/admin to login with follow:
		un:	admin
		ps: password