#!/bin/bash
#
#  NOT USED ANYMORE, use scripts/upstash-redis.ts instead
#


# FIRST make sure password is in env 
# set -a && source .env.local && set +a; 
# env|grep REDISCLI_AUTH
# https://redis.io/docs/latest/develop/tools/cli/#host-port-password-and-database
#
# SECOND use tls to read
# time redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 --scan --pattern '' >redis.all.txt
# time redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 --scan --pattern '*coord*' >redis.coord.txt
# real 3.857	user 0.020	sys 0.030	pcpu 1.29
#
# cmf > wc redis.all.txt
#     306    1013   16093 redis.all.txt
# cmf > wc redis.coord.txt
#     230     690   13131 redis.coord.txt
#
# TODO: figure out how to delete keys in bulk, like "status unresolved" or from a file
# THIS DOES NOT WORK
# cat redis.coord.txt | xargs redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 DEL

# OTHER OPTIONS
# redis-cli --scan --pattern ":coord:" | xargs -L 100 redis-cli DEL
#
#
# MANUALLY FIND, DELETE, UPDATE KEYS - CONFIRMED WORKS BY CHAD:
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 get "location:Asiento"
# "{\"original_location\":\"Asiento\",\"status\":\"unresolved\"}"
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 unlink "location:Asiento"
# (integer) 1
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 get "location:Asiento"
# (nil)
#
# Use the api with a better location name to cache in redis
# curl 'https://cmf-chad.vercel.app/api/geocode?a=Fairfax+COMMUNITY+Church,fairfax,ca'
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 keys '*'|grep -i fairfax
# location:Fairfax COMMUNITY Church, California
# location:Fairfax COMMUNITY Church,fairfax,ca
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 get 'location:Fairfax COMMUNITY Church,fairfax,ca'
# "{\"original_location\":\"Fairfax COMMUNITY Church,fairfax,ca\",\"formatted_address\":\"2398 Sir Francis Drake Blvd, Fairfax, CA 94930, USA\",\"lat\":37.995274,\"lng\":-122.5954602,\"types\":[\"church\",\"establishment\",\"place_of_worship\",\"point_of_interest\"],\"status\":\"resolved\"}"
#
# -- Now set but edit original_location to match key
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 set 'location:Fairfax COMMUNITY Church, California' "{\"original_location\":\"Fairfax COMMUNITY Church, California\",\"formatted_address\":\"2398 Sir Francis Drake Blvd, Fairfax, CA 94930, USA\",\"lat\":37.995274,\"lng\":-122.5954602,\"types\":[\"church\",\"establishment\",\"place_of_worship\",\"point_of_interest\"],\"status\":\"resolved\"}"
#
# OR if that doesn't work, no api call, just set manually:
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 set "location:Asiento" "{\"original_location\":\"Asiento\",\"formatted_address\":\"2730 21st St, San Francisco, CA 94110, USA\",\"lat\":37.7577512,\"lng\":-122.4094629,\"status\":\"resolved\"}"
# OK
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 get "location:Asiento"
# "{\"original_location\":\"Asiento\",\"formatted_address\":\"2730 21st St, San Francisco, CA 94110, USA\",\"lat\":37.7577512,\"lng\":-122.4094629,\"status\":\"resolved\"}"
#
#
# redis-cli --tls -u redis://fine-kiwi-61313.upstash.io:6379 get "location:27.735267, -15.599317 (http://coord.info/GCB3YB5)"
# "{\"original_location\":\"27.735267, -15.599317 (http://coord.info/GCB3YB5)\",\"formatted_address\":\"27.735267, -15.599317 (http://coord.info/GCB3YB5)\",\"lat\":27.735267,\"lng\":-15.599317,\"status\":\"resolved\"}"
# 
# Using unlink is faster then using del as stated in: https://redis.io/commands/unlink

#######################################################################################################
# Set your parameters
#######################################################################################################
url="redis://fine-kiwi-61313.upstash.io:6379"
rediscmd="redis-cli --tls -u $url"

REDISCLI_AUTH=`env|grep REDISCLI_AUTH`
if [ "$REDISCLI_AUTH" == "" ]; then
	echo "REDISCLI_AUTH not found, try:"
	echo "set -a && source .env.local && set +a"
	exit
fi
if [[ "$1" =~ ^location: ]]; then
    echo "$rediscmd get '$1'"
    #$rediscmd get "$1"
    echo "then do something like:"
    echo "curl 'https://cmf-chad.vercel.app/api/geocode?a=Barbary,oakland,ca'"
    exit
fi
if [ "$1" != "" ]; then
    echo "$rediscmd keys '*'|grep -i $1"
    #$rediscmd keys '*'|grep -i $1
else
    echo -e "\nEnter pattern to find location: "
    read pattern
    echo "$rediscmd keys '*'|grep -i $pattern"
fi

echo
exit
rediscmd="redis-cli -p 6379 -h fine-kiwi-61313.upstash.io --raw --no-auth-warning"


echo -e "\nTrying to delete all keys matching pattern:\n"

echo -e "\nEnter pattern: "
read pattern
outfn="redis.$pattern.keys.txt"
#keys_found=`redis-cli -p $port -h $host -a $password --raw --no-auth-warning KEYS $pattern | xargs | wc -w`
cmd="rm -f $outfn && $rediscmd --scan --pattern '*$pattern*' >$outfn"
echo $cmd
keys_found=`$cmd`

echo "wc redis.$pattern.keys.txt"
echo ""
#echo "Deleting all keys with pattern $pattern"
#redis-cli -p $port -h $host -a $password  --no-auth-warning KEYS $pattern | xargs redis-cli -p $port -h $host -a $password --raw  --no-auth-warning DEL
