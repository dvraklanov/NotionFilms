import 'dotenv/config'
import {Client} from "@notionhq/client"
import axios from "axios";
import fs from "fs"
import sleep from "sleep-promise";

const SECRET_KEY = process.env.NOTION_SECRET_KEY
const DATABASE_ID = process.env.NOTION_DATABASE_ID
const notion = new Client({auth: SECRET_KEY})
const instance = axios.create({
    baseURL: "https://kinopoiskapiunofficial.tech/api/v2.1/films/search-by-keyword",
    headers:{
        'X-API-KEY': process.env.KINOPOISK_API_KEY,
        'Content-Type': 'application/json',
    },
    timeout: 2000
})

const filmTypes = {
    FILM: "Фильм",
    TV_SERIES: "Сериал",
    MINI_SERIES: "Сериал",
}

// Чтение базы Notions
const getDatabase = async () => {

  const response = await notion.databases.query({database_id: DATABASE_ID})
    console.log(response.results)
    return response.results.map(page => {
    return {
      id: page.id,
      name: page.properties["Название"].title[0].plain_text
    }
  })


}

// Добавить в базу Notion
const addItem = async (film, name) => {
    console.log(film, name)
    if (Object.keys(film).length){
        const filmData = {
            name: film.nameRu ? film.nameRu : film.nameEn,
            type: filmTypes[film.type],
            genres: film.genres.map(genre => {return {"name": genre.genre}}),
            rating: +film.rating*10,
            url: `https://www.kinopoisk.ru/film/${film.filmId}/`
        }
        notion.pages.create({
            parent: {
                type: "database_id",
                database_id: DATABASE_ID
            },
            properties: {
                "Название": {
                    "title": [
                        {
                            type: "text",
                            "text": {
                                "content": filmData.name
                            }
                        }
                    ]
                },
                "Тип": {
                    "select": {
                        "name": filmData.type
                    }
                },
                "Жанры": {
                    "multi_select": filmData.genres
                },
                "Оценка КП": {
                    "number": filmData.rating
                },
                "Ссылка КП": {
                    "url": filmData.url
                },
                "Кто предложил": {
                    "select": {
                        "name": "Соня"
                    }
                }
            }
        })
            .then(() => console.log(name, "Записано"))
            .catch(err => console.log(name, err))
    }
    else console.log(`${name} не найдено`)
}

// Получить данные о фильме
const getFilmData = async (filmName) => {
    return instance.get("", {
        params: {
            keyword: filmName
        }
    })
        .then(r => {
            if (r.data.searchFilmsCountResult > 0){
                return r.data.films[0]
            }
            else return {}
        })
        .catch(e => console.log(e))
}

// const Film = "Холодное сердце"
// await getFilmData(Film).then(film => addItem(film, Film))
let films = fs.readFileSync("films.txt", "utf8").toString().split('\r\n')

for (const filmName of films) {
    const film = await getFilmData(filmName)
        .catch(err => console.log(err))
    await addItem(film, filmName)
        .catch(err => console.log(err))
    await sleep(100)
}