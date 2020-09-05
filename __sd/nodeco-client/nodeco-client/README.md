# nodeco-client
## How to use standalone

First of all, clone these repos below.

``` bash
cd ~
git clone https://github.com/spengejp/nodeco-client.git
git clone https://github.com/spengejp/nodeco-api.git
```

Then you should move to `nodeco-client` directory and just execute `run.sh` script.

``` bash
cd nodeco-client
./run.sh
```

Then access to url below via your local network and follow the instructions.

`http://<nodeco_running_ip>:8000/`

Note: All setting files are stored in below.

```
cd ~/.nodeco-client
```

## How to use with Nodeco-OS

If you are using Nodeco-OS, already it has a systemd daemon.

First of all, clone these repos below.

``` bash 
sudo su stakers
cd ~
git clone https://github.com/spengejp/nodeco-client.git
git clone https://github.com/spengejp/nodeco-api.git
```

Then just execute `sudo systemctl start nodeco-client`.

``` bash
sudo systemctl start nodeco-client
```

You can trace log using `journalctl`.

``` bash
sudo journalctl -f -u nodeco-client
```

Then access to url below via your local network and follow the instructions.

`http://nodeco.local:8000/`

Note: All setting files are stored in below.

```
cd ~/.nodeco-client
```