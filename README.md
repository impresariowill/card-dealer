You can use this simple web app to play trump games with your friends. Just get a computer that other people can access by an address (like a computer in a LAN or a web server)


RUNNING THE PROGRAM
===================

`node app.js`


USING THE WEB APP
=================

Suppose you've run the program at a computer with the address http://192.168.1.123 (like a computer on a LAN). Open the web app by entering in a web browser:

http://192.168.1.123:6954/index.html

You can play around with page, but probably you would want to play with others, so you need to host a room first


HOSTING A ROOM
==============

Click "Host" at the top right corner. Enter your name and confirm. A room number will appear at the top right corner. You've already hosted a room!


JOINING A ROOM
==============

If you want to join a hosted room, open the web app (again, entering something like http://192.168.1.123/index.html on a web browser), click "Join" at the top right corner, enter the room number (as told by your host) and your name, then confirm.


PLAYING WITH THE INTERFACE
==========================

The web app is just a playground that lets you move cards around so you can play any trump games you want with it. The descriptions of the different areas are as follows:


- Card stack: The rightmost area in the middle row. Clicking it will let you draw a card to your hand. Long press it will trigger a menu. You can find some handy functions like "Collect Cards & Shuffle", "Distribute (Cards)" in it. Feel free to play around with it. You can also drag a card from other areas to here to put the card at the top of the stack (as the next card to be drawn)

- Your hand: The bottom row. The cards here are only visible to you, though others can see how many cards you have.

- Your card playing area: The middle-bottom row. All players can see the cards. You can drag cards to and from this area.

- Common area: The middle row's main area. All players can see the cards. All players can drag cards to this area, and drag the latest card from it to other area.

- Other players' area: The large upper part of the page. You can see other players' names, hand (only the back of cards is visible), card playing areas.